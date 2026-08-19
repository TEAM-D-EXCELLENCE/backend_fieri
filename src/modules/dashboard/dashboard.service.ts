import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getPlatformStats() {
    const [
      membersCount,
      publicationsCount,
      eventsCount,
      projectsCount,
      clubsCount,
      workshopsCount,
      contributionsCount,
    ] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.news.count({ where: { status: 'APPROVED' } }),
      this.prisma.event.count(),
      this.prisma.project.count(),
      this.prisma.club.count(),
      this.prisma.workshop.count(),
      this.prisma.projectContribution.aggregate({
        _sum: { amount: true },
      }),
    ]);

    return {
      success: true,
      data: {
        membersCount,
        publicationsCount,
        eventsCount,
        projectsCount,
        clubsCount,
        workshopsCount,
        satisfaction: 92, // Note fixe en attendant un vrai système de feedback
        trainedParticipants: workshopsCount * 15, // Approximation
        totalBudgetRaised: contributionsCount._sum.amount || 0,
      },
    };
  }

  async getMyStats(memberId: number) {
    const [
      joinedClubsCount,
      starredProjectsCount,
      registeredWorkshopsCount,
      followedProjects,
      upcomingEvents,
      recentPublications,
      clubs,
    ] = await Promise.all([
      this.prisma.clubMembership.count({
        where: { memberId, status: 'APPROVED' },
      }),
      this.prisma.projectFollow.count({ where: { memberId } }),
      this.prisma.workshopRegistration.count({
        where: { memberId, status: 'REGISTERED' },
      }),
      this.prisma.projectFollow.findMany({
        where: { memberId },
        include: {
          project: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { project: { createdAt: 'desc' } },
        take: 5,
      }),
      this.prisma.eventRegistration.findMany({
        where: { memberId },
        include: {
          event: {
            select: { id: true, title: true, date: true, isLive: true },
          },
        },
        orderBy: { event: { date: 'asc' } },
        take: 5,
      }),
      this.prisma.news.findMany({
        where: { authorId: memberId, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.clubMembership.findMany({
        where: { memberId, status: 'APPROVED' },
        include: {
          club: {
            select: { id: true, name: true, discipline: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        joinedClubsCount,
        starredProjectsCount,
        registeredWorkshopsCount,
        clubs: clubs.map((m) => ({
          id: m.club.id,
          name: m.club.name,
          discipline: m.club.discipline,
        })),
        followedProjects: followedProjects.map((f) => ({
          id: f.project.id,
          title: f.project.title,
          status: f.project.status,
        })),
        upcomingEvents: upcomingEvents.map((r) => ({
          id: r.event.id,
          title: r.event.title,
          date: r.event.date,
          isLive: r.event.isLive,
        })),
        recentPublications: recentPublications.map((n) => ({
          id: n.id,
          title: n.title,
          category: n.category,
          createdAt: n.createdAt,
        })),
      },
    };
  }

  async getMyNotifications(memberId: number) {
    const notifications = await this.prisma.notification.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      })),
    };
  }

  async markNotificationAsRead(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification non trouvée');
    }

    await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return {
      success: true,
      message: 'Notification marquée comme lue.',
    };
  }

  async clearMyNotifications(memberId: number) {
    await this.prisma.notification.deleteMany({
      where: { memberId },
    });

    return {
      success: true,
      message: 'Toutes les notifications ont été supprimées.',
    };
  }
}
