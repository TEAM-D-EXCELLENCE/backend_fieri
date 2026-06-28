import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMyStats(memberId: number) {
    const joinedClubsCount = await this.prisma.clubMembership.count({
      where: {
        memberId,
        status: 'APPROVED',
      },
    });

    const starredProjectsCount = await this.prisma.projectFollow.count({
      where: {
        memberId,
      },
    });

    const registeredWorkshopsCount = await this.prisma.workshopRegistration.count({
      where: {
        memberId,
        status: 'REGISTERED',
      },
    });

    return {
      success: true,
      data: {
        joinedClubsCount,
        starredProjectsCount,
        registeredWorkshopsCount,
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
      data: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      })),
    };
  }

  async markNotificationAsRead(id: string, memberId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification non trouvée');
    }

    if (notification.memberId !== memberId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette notification.");
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
