import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClubService {
  constructor(private prisma: PrismaService) {}

  // --- CLUBS ENDPOINTS ---

  async getClubs() {
    const clubs = await this.prisma.club.findMany({
      include: {
        memberships: {
          where: { status: 'APPROVED' },
        },
      },
    });

    const formattedClubs = clubs.map(club => ({
      id: club.id,
      name: club.name,
      discipline: club.discipline,
      memberCount: club.memberships.length,
    }));

    return {
      success: true,
      data: formattedClubs,
    };
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
      },
    });

    if (!club) {
      throw new NotFoundException('Club non trouvé');
    }

    const members = club.memberships.map(m => ({
      id: m.member.id,
      firstName: m.member.firstname,
      lastName: m.member.lastname,
    }));

    return {
      success: true,
      data: {
        id: club.id,
        name: club.name,
        description: club.description || '',
        members,
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

  async createMembershipRequest(clubId: string, memberId: number) {
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

    const membership = await this.prisma.clubMembership.upsert({
      where: {
        clubId_memberId: {
          clubId,
          memberId,
        },
      },
      update: {
        status: 'PENDING',
      },
      create: {
        clubId,
        memberId,
        status: 'PENDING',
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

    const data = requests.map(r => ({
      id: r.id,
      clubId: r.clubId,
      status: r.status,
      user: {
        id: r.member.id,
        firstName: r.member.firstname,
        lastName: r.member.lastname,
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

    const data = requests.map(r => ({
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

    const data = requests.map(r => ({
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
      message: 'Demande d\'adhésion refusée.',
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
      throw new NotFoundException("Adhésion non trouvée");
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
}
