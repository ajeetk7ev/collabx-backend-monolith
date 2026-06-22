import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { uploadToCloudinary } from "../config/cloudinary";
import bcrypt from "bcryptjs";
import { publishEvent } from "../shared/kafka/producer";
import { TOPICS } from "../shared/kafka/topics";

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
      avatarBuffer?: Buffer;
    },
    actorId?: number
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

    // Upload avatar if provided
    if (data.avatarBuffer) {
      const result = await uploadToCloudinary(data.avatarBuffer, "collabx/avatars");
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: result.secure_url },
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

    // Publish event
    try {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      const workspaceName = workspace ? workspace.name : "Workspace";

      await publishEvent(TOPICS.WORKSPACE_INVITED, {
        workspaceId,
        recipientId: member.userId,
        actorId: actorId || workspace?.ownerId || 0,
        title: "Invited to Workspace",
        description: `You have been added to the workspace "${workspaceName}" as a ${member.role}.`,
        metadata: {
          role: member.role,
          workspaceName,
        },
      });

      if (member.status === "active") {
        await publishEvent(TOPICS.MEMBER_JOINED, {
          workspaceId,
          recipientId: workspace?.ownerId || 0,
          actorId: member.userId,
          title: "New Member Joined",
          description: `${member.user.firstname} ${member.user.lastname} has joined the workspace "${workspaceName}".`,
          metadata: {
            memberId: member.id,
            email: member.user.email,
          },
        });
      }
    } catch (err) {
      console.error("Failed to publish workspace membership Kafka events:", err);
    }

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
      avatarBuffer?: Buffer;
    },
    actorId?: number
  ) {
    // Verify member exists in this workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) {
      throw new ApiError(404, "Member not found in this workspace.");
    }

    const oldRole = member.role;

    // Upload avatar if provided
    if (data.avatarBuffer) {
      const result = await uploadToCloudinary(data.avatarBuffer, "collabx/avatars");
      await prisma.user.update({
        where: { id: member.userId },
        data: { avatar: result.secure_url },
      });
    }

    const updatedMember = await prisma.workspaceMember.update({
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

    // Publish event if role changed
    if (data.role && oldRole !== data.role) {
      try {
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
        await publishEvent(TOPICS.ROLE_CHANGED, {
          workspaceId,
          recipientId: updatedMember.userId,
          actorId: actorId || workspace?.ownerId || 0,
          title: "Workspace Role Updated",
          description: `Your role in the workspace "${workspace?.name || 'Workspace'}" was updated to ${data.role}.`,
          metadata: {
            oldRole,
            newRole: data.role,
          },
        });
      } catch (err) {
        console.error("Failed to publish ROLE_CHANGED Kafka event:", err);
      }
    }

    return updatedMember;
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
