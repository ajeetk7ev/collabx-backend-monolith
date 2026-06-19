import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";

export class WorkspaceService {
  /**
   * Create a new workspace.
   */
  static async create(
    data: { name: string; slug: string },
    ownerId: number,
    logoBuffer?: Buffer
  ) {
    // Check slug uniqueness
    const existing = await prisma.workspace.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ApiError(400, "A workspace with this URL already exists. Please choose a different slug.");
    }

    // Upload logo if provided
    let logoUrl: string | null = null;
    if (logoBuffer) {
      const result = await uploadToCloudinary(logoBuffer);
      logoUrl = result.secure_url;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        slug: data.slug,
        logo: logoUrl,
        ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return workspace;
  }

  /**
   * Get a workspace by ID.
   */
  static async getById(id: number) {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new ApiError(404, "Workspace not found.");
    }

    return workspace;
  }

  /**
   * Get all workspaces owned by a specific user.
   */
  static async getByOwnerId(ownerId: number) {
    const workspaces = await prisma.workspace.findMany({
      where: { ownerId },
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return workspaces;
  }

  /**
   * Update a workspace. Only the owner can update it.
   */
  static async update(
    id: number,
    data: { name?: string; slug?: string },
    userId: number,
    logoBuffer?: Buffer
  ) {
    // Verify workspace exists and user is the owner
    const workspace = await prisma.workspace.findUnique({ where: { id } });

    if (!workspace) {
      throw new ApiError(404, "Workspace not found.");
    }

    if (workspace.ownerId !== userId) {
      throw new ApiError(403, "You can only update your own workspaces.");
    }

    // Check slug uniqueness if slug is being changed
    if (data.slug && data.slug !== workspace.slug) {
      const existing = await prisma.workspace.findUnique({
        where: { slug: data.slug },
      });
      if (existing) {
        throw new ApiError(400, "A workspace with this URL already exists.");
      }
    }

    // Upload new logo if provided
    let logoUrl: string | undefined = undefined;
    if (logoBuffer) {
      // Delete old logo from Cloudinary if it exists
      if (workspace.logo) {
        const publicId = extractPublicId(workspace.logo);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }
      const result = await uploadToCloudinary(logoBuffer);
      logoUrl = result.secure_url;
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (logoUrl !== undefined) updateData.logo = logoUrl;

    const updated = await prisma.workspace.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete a workspace. Only the owner can delete it.
   */
  static async delete(id: number, userId: number) {
    const workspace = await prisma.workspace.findUnique({ where: { id } });

    if (!workspace) {
      throw new ApiError(404, "Workspace not found.");
    }

    if (workspace.ownerId !== userId) {
      throw new ApiError(403, "You can only delete your own workspaces.");
    }

    // Delete logo from Cloudinary if it exists
    if (workspace.logo) {
      const publicId = extractPublicId(workspace.logo);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    await prisma.workspace.delete({ where: { id } });
  }
}

/**
 * Extract public ID from a Cloudinary URL.
 * e.g., "https://res.cloudinary.com/.../collabx/workspace-logos/abc123.jpg"
 *  → "collabx/workspace-logos/abc123"
 */
function extractPublicId(url: string): string | null {
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    // Remove version prefix like v1234567890/
    const afterUpload = parts[1]!.replace(/^v\d+\//, "");
    // Remove file extension
    return afterUpload.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}
