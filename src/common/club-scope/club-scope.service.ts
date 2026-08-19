import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Rattache un club à son université.
 *
 * Le lien n'est pas porté par le club lui-même : il se déduit de la filière de
 * son responsable, et à défaut de celle d'un de ses membres approuvés. Cette
 * résolution sert à la fois aux contrôles d'accès (garde) et à la logique
 * métier (recensements, rapports d'activité) : elle vit donc ici, en un seul
 * exemplaire, plutôt que recopiée de part et d'autre.
 */
@Injectable()
export class ClubScopeService {
  constructor(private prisma: PrismaService) {}

  async getClubUniversityId(clubId: string): Promise<number | null> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: { responsible: { include: { branch: true } } },
    });
    if (club?.responsible?.branch) {
      return club.responsible.branch.universityId;
    }
    const membership = await this.prisma.clubMembership.findFirst({
      where: { clubId, status: 'APPROVED' },
      include: { member: { include: { branch: true } } },
    });
    return membership?.member.branch.universityId ?? null;
  }
}
