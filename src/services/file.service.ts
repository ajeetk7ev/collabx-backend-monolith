import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { uploadRawFileToCloudinary, deleteFromCloudinary } from "../config/cloudinary";

export class FileService {
  /**
   * Helper to verify if the user has owner, admin, or active member privileges in the workspace.
   */
  static async checkWorkspaceAccess(
    workspaceId: number,
    userId: number
  ): Promise<{ isOwnerOrAdmin: boolean; role: string }> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) {
      throw new ApiError(404, "Workspace not found");
    }

    if (workspace.ownerId === userId) {
      return { isOwnerOrAdmin: true, role: "owner" };
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      select: { role: true, status: true },
    });

    if (!member || member.status !== "active") {
      throw new ApiError(403, "Access denied. You are not an active member of this workspace.");
    }

    const isOwnerOrAdmin = member.role === "owner" || member.role === "admin";
    return { isOwnerOrAdmin, role: member.role };
  }

  /**
   * Upload a new file to the workspace.
   */
  static async uploadFile(
    workspaceId: number,
    userId: number,
    file: Express.Multer.File,
    channelId?: number
  ) {
    // 1. Verify workspace access
    await this.checkWorkspaceAccess(workspaceId, userId);

    // Determine Cloudinary resource type: images and PDFs as image, videos as video, and everything else as raw
    let resourceType: "image" | "video" | "raw" = "raw";
    const mt = file.mimetype.toLowerCase();
    if (mt.includes("image") || mt.includes("pdf")) {
      resourceType = "image";
    } else if (mt.includes("video")) {
      resourceType = "video";
    }

    // 2. Upload to Cloudinary
    const uploadResult = await uploadRawFileToCloudinary(file.buffer, file.originalname, resourceType);

    // 3. Format file size
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeString = file.size > 1024 * 1024 ? `${sizeInMb} MB` : `${Math.round(file.size / 1024)} KB`;

    // 4. Map MIME type to frontend file kinds: "figma" | "pdf" | "image" | "doc" | "video" | "zip" | "sheet"
    let kind: "figma" | "pdf" | "image" | "doc" | "video" | "zip" | "sheet" = "doc";
    if (mt.includes("image")) kind = "image";
    else if (mt.includes("video")) kind = "video";
    else if (mt.includes("pdf")) kind = "pdf";
    else if (mt.includes("zip") || mt.includes("tar") || mt.includes("rar") || mt.includes("gzip")) kind = "zip";
    else if (mt.includes("sheet") || mt.includes("excel") || mt.includes("csv")) kind = "sheet";
    else if (file.originalname.endsWith(".fig")) kind = "figma";

    // 5. Create file database entry
    const newFile = await prisma.file.create({
      data: {
        name: file.originalname,
        kind,
        size: sizeString,
        mimeType: file.mimetype,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        workspaceId,
        ownerId: userId,
        channelId: channelId || null,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return newFile;
  }

  /**
   * Get all files in the workspace.
   * Enforces role separation: general members see only their own files, while owners/admins see all.
   */
  static async listFiles(workspaceId: number, userId: number, queryParams?: { q?: string | undefined }) {
    // 1. Verify workspace access and get role info
    const { isOwnerOrAdmin } = await this.checkWorkspaceAccess(workspaceId, userId);

    const searchString = queryParams?.q?.trim() || "";

    const whereClause: any = {
      workspaceId,
      // If regular member, they can only see their own files
      ...(!isOwnerOrAdmin && { ownerId: userId }),
      ...(searchString && {
        name: {
          contains: searchString,
          mode: "insensitive",
        },
      }),
    };

    const files = await prisma.file.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return files;
  }

  /**
   * Delete a file from the workspace.
   * Enforces permissions: members can delete their own files, owners/admins can delete any file.
   */
  static async deleteFile(workspaceId: number, userId: number, fileId: number) {
    // 1. Get file
    const file = await prisma.file.findFirst({
      where: { id: fileId, workspaceId },
    });

    if (!file) {
      throw new ApiError(404, "File not found or does not belong to this workspace.");
    }

    // 2. Verify workspace access and get role info
    const { isOwnerOrAdmin } = await this.checkWorkspaceAccess(workspaceId, userId);

    // 3. Separation constraint: members can only delete their own files
    if (file.ownerId !== userId && !isOwnerOrAdmin) {
      throw new ApiError(403, "You do not have permission to delete this file.");
    }

    // 4. Delete from Cloudinary
    let resourceType: "image" | "video" | "raw" = "raw";
    const mt = file.mimeType.toLowerCase();
    if (mt.includes("image") || mt.includes("pdf")) {
      resourceType = "image";
    } else if (mt.includes("video")) {
      resourceType = "video";
    }
    await deleteFromCloudinary(file.publicId, resourceType);

    // 5. Delete from database
    await prisma.file.delete({
      where: { id: fileId },
    });

    return true;
  }
}
