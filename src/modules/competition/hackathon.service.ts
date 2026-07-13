import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateHackathonDto {
  title: string;
  description: string;
  theme?: string;
  startDate: string;
  endDate: string;
  clubId: string;
}

@Injectable()
export class HackathonService {
  constructor(private prisma: PrismaService) {}

  /**
   * Création d'un hackathon par le Chef Universitaire, affecté à un club
   * (Cité) sous sa responsabilité. L'autorisation de poste est vérifiée par
   * le `UniversityPostGuard` sur la route ; ici on valide les données.
   */
  async createHackathon(
    universityId: number,
    dto: CreateHackathonDto,
    creatorId: number,
  ) {
    if (!dto.title?.trim() || !dto.description?.trim()) {
      throw new BadRequestException('Titre et description sont requis.');
    }
    if (!dto.clubId?.trim()) {
      throw new BadRequestException('Le club affecté (clubId) est requis.');
    }
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Dates de début/fin invalides.');
    }
    if (end < start) {
      throw new BadRequestException(
        'La date de fin doit suivre la date de début.',
      );
    }

    const club = await this.prisma.club.findUnique({
      where: { id: dto.clubId },
    });
    if (!club) {
      throw new NotFoundException('Club affecté introuvable.');
    }

    const hackathon = await this.prisma.hackathon.create({
      data: {
        universityId,
        clubId: dto.clubId,
        createdById: creatorId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        theme: dto.theme?.trim() || null,
        startDate: start,
        endDate: end,
      },
    });
    return { success: true, data: hackathon };
  }

  /** Hackathons d'un club. */
  async listByClub(clubId: string) {
    const hackathons = await this.prisma.hackathon.findMany({
      where: { clubId },
      orderBy: { startDate: 'desc' },
    });
    return { success: true, data: hackathons };
  }

  /** Hackathons d'une université. */
  async listByUniversity(universityId: number) {
    const hackathons = await this.prisma.hackathon.findMany({
      where: { universityId },
      orderBy: { startDate: 'desc' },
      include: { club: { select: { name: true } } },
    });
    return {
      success: true,
      data: hackathons.map((h) => ({
        id: h.id,
        title: h.title,
        theme: h.theme,
        startDate: h.startDate,
        endDate: h.endDate,
        status: h.status,
        club: h.club.name,
      })),
    };
  }
}
