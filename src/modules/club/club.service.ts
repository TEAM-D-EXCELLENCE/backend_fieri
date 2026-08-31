import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PaginatedResponse } from '../../common/pagination';

@Injectable()
export class ClubService {
  constructor(private prisma: PrismaService) {}

  // --- CLUBS ENDPOINTS ---

  async getClubs(page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit || undefined;

    const [clubs, total] = await Promise.all([
      this.prisma.club.findMany({
        skip,
        take,
        include: {
          memberships: {
            where: { status: 'APPROVED' },
          },
          responsible: {
            select: { id: true, firstname: true, lastname: true },
          },
        },
      }),
      this.prisma.club.count(),
    ]);

    const formattedClubs = clubs.map((club) => ({
      id: club.id,
      name: club.name,
      discipline: club.discipline,
      memberCount: club.memberships.length,
      responsibleId: club.responsibleId,
      responsible: club.responsible
        ? {
            id: club.responsible.id,
            firstName: club.responsible.firstname,
            lastName: club.responsible.lastname,
          }
        : null,
    }));

    const result: PaginatedResponse<(typeof formattedClubs)[number]> = {
      success: true,
      data: formattedClubs,
    };

    if (page && limit) {
      result.pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }

    return result;
  }

  async getClubById(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: 'APPROVED' },
          include: {
            member: true,
          },
        },
        responsible: { select: { id: true, firstname: true, lastname: true } },
      },
    });

    if (!club) {
      throw new NotFoundException('Club non trouvé');
    }

    const members = club.memberships.map((m) => ({
      id: m.member.id,
      firstName: m.member.firstname,
      lastName: m.member.lastname,
      role: m.member.role,
    }));

    const projects = await this.prisma.project.findMany({
      where: { clubId: id },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: {
        id: club.id,
        name: club.name,
        discipline: club.discipline,
        description: club.description || '',
        responsibleId: club.responsibleId,
        responsible: club.responsible
          ? {
              id: club.responsible.id,
              firstName: club.responsible.firstname,
              lastName: club.responsible.lastname,
            }
          : null,
        members,
        projects,
      },
    };
  }

  async joinClubDirect(clubId: string, memberId: number) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club non trouvé');
    }

    const existing = await this.prisma.clubMembership.findUnique({
      where: {
        clubId_memberId: {
          clubId,
          memberId,
        },
      },
    });

    if (existing && existing.status === 'APPROVED') {
      throw new ConflictException('Vous êtes déjà membre de ce club.');
    }

    // Upsert membership as APPROVED
    await this.prisma.clubMembership.upsert({
      where: {
        clubId_memberId: {
          clubId,
          memberId,
        },
      },
      update: {
        status: 'APPROVED',
      },
      create: {
        clubId,
        memberId,
        status: 'APPROVED',
      },
    });

    return {
      success: true,
      message: 'Vous avez rejoint le club.',
    };
  }

  async leaveClubDirect(clubId: string, memberId: number) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club non trouvé');
    }

    const membership = await this.prisma.clubMembership.findUnique({
      where: {
        clubId_memberId: {
          clubId,
          memberId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException("Vous n'êtes pas membre de ce club.");
    }

    await this.prisma.clubMembership.delete({
      where: {
        clubId_memberId: {
          clubId,
          memberId,
        },
      },
    });

    return {
      success: true,
      message: 'Vous avez quitté le club.',
    };
  }

  // --- MEMBERSHIPS ENDPOINTS ---

  async createMembershipRequest(
    clubId: string,
    memberId: number,
    data: { motivation?: string; contact?: string } = {},
  ) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club non trouvé');
    }

    // Check if membership already exists
    const existing = await this.prisma.clubMembership.findUnique({
      where: {
        clubId_memberId: {
          clubId,
          memberId,
        },
      },
    });

    if (existing && existing.status === 'APPROVED') {
      throw new ConflictException('Vous êtes déjà membre approuvé de ce club.');
    }

    const motivation = data.motivation?.trim() || null;
    const contact = data.contact?.trim() || null;

    const membership = await this.prisma.clubMembership.upsert({
      where: {
        clubId_memberId: {
          clubId,
          memberId,
        },
      },
      // Une nouvelle demande apres un refus remplace l'ancienne : c'est le
      // texte qu'on vient d'ecrire que le responsable doit lire, pas celui de
      // la tentative precedente.
      update: {
        status: 'PENDING',
        motivation,
        contact,
      },
      create: {
        clubId,
        memberId,
        status: 'PENDING',
        motivation,
        contact,
      },
    });

    return {
      success: true,
      message: "Votre demande d'adhésion a été soumise au responsable du pôle.",
      data: {
        id: membership.id,
        clubId: membership.clubId,
        status: membership.status,
      },
    };
  }

  async getPendingRequestsForClub(clubId: string) {
    const requests = await this.prisma.clubMembership.findMany({
      where: {
        clubId,
        status: 'PENDING',
      },
      include: {
        member: true,
      },
    });

    // Le responsable decide : il lui faut de quoi decider. Le nom seul ne
    // suffisait pas — ni pour reconnaitre la personne, ni pour la joindre.
    const data = requests.map((r) => ({
      id: r.id,
      clubId: r.clubId,
      status: r.status,
      motivation: r.motivation,
      contact: r.contact,
      createdAt: r.createdAt,
      user: {
        id: r.member.id,
        firstName: r.member.firstname,
        lastName: r.member.lastname,
        email: r.member.email,
      },
    }));

    return {
      success: true,
      data,
    };
  }

  async getClubHistory(clubId: string) {
    const requests = await this.prisma.clubMembership.findMany({
      where: { clubId },
      include: { member: true },
      orderBy: { updatedAt: 'desc' },
    });

    const data = requests.map((r) => ({
      id: r.id,
      clubId: r.clubId,
      status: r.status,
      user: {
        id: r.member.id,
        firstName: r.member.firstname,
        lastName: r.member.lastname,
        email: r.member.email,
      },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return {
      success: true,
      data,
    };
  }

  async getUserRequests(userId: number) {
    const requests = await this.prisma.clubMembership.findMany({
      where: { memberId: userId },
      include: { club: true },
      orderBy: { updatedAt: 'desc' },
    });

    const data = requests.map((r) => ({
      id: r.id,
      clubId: r.clubId,
      clubName: r.club.name,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return {
      success: true,
      data,
    };
  }

  async approveRequest(requestId: string) {
    const request = await this.prisma.clubMembership.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Demande d'adhésion non trouvée");
    }

    await this.prisma.clubMembership.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    // Create a notification for the member
    await this.prisma.notification.create({
      data: {
        memberId: request.memberId,
        title: 'Adhésion Club Approuvée',
        message: `Votre demande pour rejoindre le club a été approuvée !`,
      },
    });

    return {
      success: true,
      message: 'Demande approuvée. Le chercheur est désormais membre du club.',
    };
  }

  async rejectRequest(requestId: string) {
    const request = await this.prisma.clubMembership.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Demande d'adhésion non trouvée");
    }

    await this.prisma.clubMembership.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    return {
      success: true,
      message: "Demande d'adhésion refusée.",
    };
  }

  async removeUserMembership(clubId: string, userId: number) {
    const membership = await this.prisma.clubMembership.findUnique({
      where: {
        clubId_memberId: {
          clubId,
          memberId: userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Adhésion non trouvée');
    }

    await this.prisma.clubMembership.delete({
      where: {
        clubId_memberId: {
          clubId,
          memberId: userId,
        },
      },
    });

    return {
      success: true,
      message: 'Vous avez quitté le club.',
    };
  }

  async createClub(data: {
    name: string;
    discipline: string;
    description?: string;
  }) {
    const club = await this.prisma.club.create({
      data: {
        id: `club-${Date.now()}`,
        ...data,
      },
    });
    return {
      success: true,
      data: club,
    };
  }

  async updateClub(
    id: string,
    data: Partial<{ name: string; discipline: string; description: string }>,
  ) {
    const club = await this.prisma.club.findUnique({
      where: { id },
    });
    if (!club) {
      throw new NotFoundException('Club non trouvé');
    }
    const updated = await this.prisma.club.update({
      where: { id },
      data,
    });
    return {
      success: true,
      data: updated,
    };
  }

  async deleteClub(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
    });
    if (!club) {
      throw new NotFoundException('Club non trouvé');
    }
    await this.prisma.clubMembership.deleteMany({
      where: { clubId: id },
    });
    await this.prisma.project.deleteMany({
      where: { clubId: id },
    });
    await this.prisma.club.delete({
      where: { id },
    });
    return {
      success: true,
      message: 'Club supprimé avec succès.',
    };
  }
}
