import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export class DocumentService {
  /**
   * List all documents in a workspace.
   */
  static async list(workspaceId: number, userId: number) {
    const docs = await prisma.document.findMany({
      where: { workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
        favoritedBy: {
          where: { userId },
          select: { userId: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return docs.map((doc) => {
      const { favoritedBy, ...rest } = doc;
      return {
        ...rest,
        isFavorite: favoritedBy.length > 0,
      };
    });
  }

  /**
   * Get a document by ID.
   */
  static async getById(id: number, workspaceId: number, userId: number) {
    const doc = await prisma.document.findFirst({
      where: { id, workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
        favoritedBy: {
          where: { userId },
          select: { userId: true },
        },
      },
    });

    if (!doc) {
      throw new ApiError(404, "Document not found.");
    }

    const { favoritedBy, ...rest } = doc;
    return {
      ...rest,
      isFavorite: favoritedBy.length > 0,
    };
  }

  /**
   * Create a new document in the workspace.
   */
  static async create(
    workspaceId: number,
    ownerId: number,
    data: { title?: string; emoji?: string; summary?: string; body?: string }
  ) {
    const doc = await prisma.document.create({
      data: {
        title: data.title ?? "Untitled",
        emoji: data.emoji ?? "📄",
        summary: data.summary ?? "",
        body: data.body ?? "# Untitled\n\nStart writing…",
        workspaceId,
        ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...doc,
      isFavorite: false,
    };
  }

  /**
   * Update an existing document.
   */
  static async update(
    id: number,
    workspaceId: number,
    userId: number,
    data: { title?: string; emoji?: string; summary?: string; body?: string }
  ) {
    const existing = await prisma.document.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new ApiError(404, "Document not found.");
    }

    const updated = await prisma.document.update({
      where: { id },
      data,
      include: {
        owner: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            avatar: true,
          },
        },
        favoritedBy: {
          where: { userId },
          select: { userId: true },
        },
      },
    });

    const { favoritedBy, ...rest } = updated;
    return {
      ...rest,
      isFavorite: favoritedBy.length > 0,
    };
  }

  /**
   * Delete a document.
   */
  static async delete(id: number, workspaceId: number) {
    const existing = await prisma.document.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new ApiError(404, "Document not found.");
    }

    await prisma.document.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Toggle favorite status.
   */
  static async toggleFavorite(id: number, workspaceId: number, userId: number) {
    const existing = await prisma.document.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new ApiError(404, "Document not found.");
    }

    const favorite = await prisma.favoriteDocument.findUnique({
      where: {
        userId_documentId: {
          userId,
          documentId: id,
        },
      },
    });

    if (favorite) {
      await prisma.favoriteDocument.delete({
        where: {
          userId_documentId: {
            userId,
            documentId: id,
          },
        },
      });
      return { isFavorite: false };
    } else {
      await prisma.favoriteDocument.create({
        data: {
          userId,
          documentId: id,
        },
      });
      return { isFavorite: true };
    }
  }
}
