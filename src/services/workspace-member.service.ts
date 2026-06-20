import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import bcrypt from "bcryptjs";

export class WorkspaceMemberService {
  static async addMember(
    workspaceId: number,
    data: {
      firstname: string;
      lastname: string;
      email: string;
      password?: string;
      role: "owner" | "admin" | "member";
      status: string;
      presence: string;
    }
  ) {
    let user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      if (!data.password) {
        throw new ApiError(400, "Password is required for new users.");
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      user = await prisma.user.create({
        data: {
          firstname: data.firstname,
          lastname: data.lastname,
          email: data.email,
          password: hashedPassword,
          role: "member", // default global role
        },
      });
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    });

    if (existingMember) {
      throw new ApiError(400, "User is already a member of this workspace.");
    }

    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role: data.role as any,
        status: data.status,
        presence: data.presence,
      },
      include: {
        user: {
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

    return member;
  }

  static async getMembers(
    workspaceId: number,
    params?: { page: number; limit: number; q?: string; role?: string }
  ) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const q = params?.q || "";
    const role = params?.role || "all";

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = { workspaceId };

    if (role !== "all") {
      where.role = role;
    }

    if (q) {
      where.user = {
        OR: [
          { firstname: { contains: q, mode: "insensitive" } },
          { lastname: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    const total = await prisma.workspaceMember.count({ where });
    const members = await prisma.workspaceMember.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      members,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async updateMember(
    workspaceId: number,
    memberId: number,
    data: {
      role?: "owner" | "admin" | "member";
      status?: string;
      presence?: string;
    }
  ) {
    // Verify member exists in this workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw new ApiError(404, "Member not found in this workspace.");
    }

    return prisma.workspaceMember.update({
      where: { id: memberId },
      data: {
        ...(data.role && { role: data.role as any }),
        ...(data.status && { status: data.status }),
        ...(data.presence && { presence: data.presence }),
      },
      include: {
        user: {
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
  }

  static async removeMember(workspaceId: number, memberId: number) {
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw new ApiError(404, "Member not found in this workspace.");
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });
  }
}
