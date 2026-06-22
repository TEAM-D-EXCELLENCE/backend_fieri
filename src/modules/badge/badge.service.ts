import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BadgeService {
  constructor(private prisma: PrismaService) {}

  async getBadgesByUser(userId: number) {
    const badges = await this.prisma.badge.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: badges.map(b => ({
        id: b.id,
        badgeType: b.badgeType,
        userName: b.userName,
        awardedBy: b.awardedBy,
      })),
    };
  }

  async awardBadge(data: { userId: number; userName: string; badgeType: string; awardedBy: string }) {
    // Verify user exists
    const user = await this.prisma.member.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const badge = await this.prisma.badge.create({
      data: {
        userId: data.userId,
        userName: data.userName,
        badgeType: data.badgeType,
        awardedBy: data.awardedBy,
      },
    });

    // Optionnel : ajouter le type de badge dans les distinctions du profil pour maintenir la cohérence
    const currentDistinctions = user.distinctions || [];
    if (!currentDistinctions.includes(data.badgeType)) {
      await this.prisma.member.update({
        where: { id: data.userId },
        data: {
          distinctions: {
            set: [...currentDistinctions, data.badgeType],
          },
        },
      });
    }

    // Create a notification for the recipient
    await this.prisma.notification.create({
      data: {
        memberId: data.userId,
        title: 'Nouvelle Distinction Reçue !',
        message: `Félicitations ! Vous avez reçu le badge "${data.badgeType}" de la part de "${data.awardedBy}".`,
      },
    });

    return {
      success: true,
      message: 'Badge attribué avec succès.',
      data: {
        id: badge.id,
        badgeType: badge.badgeType,
      },
    };
  }

  async revokeBadge(id: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { id },
    });

    if (!badge) {
      throw new NotFoundException('Badge non trouvé');
    }

    await this.prisma.badge.delete({
      where: { id },
    });

    // Optionnel : retirer de distinctions du profil
    const user = await this.prisma.member.findUnique({
      where: { id: badge.userId },
    });
    if (user) {
      const updatedDistinctions = (user.distinctions || []).filter(d => d !== badge.badgeType);
      await this.prisma.member.update({
        where: { id: badge.userId },
        data: {
          distinctions: {
            set: updatedDistinctions,
          },
        },
      });
    }

    return {
      success: true,
      message: 'Badge révoqué avec succès.',
    };
  }
}
