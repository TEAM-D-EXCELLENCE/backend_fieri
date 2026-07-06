import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContributionService {
  constructor(private prisma: PrismaService) {}

  async createDonation(
    data: { amount: number; email: string; message?: string },
    memberId: number | null,
  ) {
    await this.prisma.contribution.create({
      data: {
        type: 'donation',
        amount: data.amount,
        email: data.email,
        message: data.message || null,
        memberId,
      },
    });

    return {
      success: true,
      message: 'Merci pour votre don ! Votre contribution est enregistrée.',
    };
  }

  async createPartnership(
    data: { organisation: string; email: string; message?: string },
    memberId: number | null,
  ) {
    await this.prisma.contribution.create({
      data: {
        type: 'partnership',
        organisation: data.organisation,
        email: data.email,
        message: data.message || null,
        memberId,
      },
    });

    return {
      success: true,
      message: 'Votre demande de partenariat a été reçue. Nous vous contacterons.',
    };
  }

  async getMyContributions(memberId: number) {
    const contributions = await this.prisma.contribution.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: contributions.map((c) => ({
        id: c.id,
        type: c.type,
        amount: c.amount,
        organisation: c.organisation,
        message: c.message,
        createdAt: c.createdAt,
      })),
    };
  }
}
