import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateChallengeDto {
  title: string;
  description: string;
  rules: string;
  dueDate: string;
  rewardBadgeType?: string;
}

export interface SubmitDto {
  fileUrl: string;
}

export interface EvaluateDto {
  grade?: number;
  feedback?: string;
}

export interface CloseChallengeDto {
  winnerMemberIds?: number[];
}

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);

  constructor(private prisma: PrismaService) {}

  private async assertClubResponsible(clubId: string, userId: number) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club introuvable.');
    }
    const requester = await this.prisma.member.findUnique({
      where: { id: userId },
    });
    if (requester?.role === 'ADMIN') return club;
    if (club.responsibleId !== userId) {
      throw new ForbiddenException('Action réservée au responsable du club.');
    }
    return club;
  }

  /** Création d'un challenge par le responsable du club. */
  async createChallenge(
    clubId: string,
    dto: CreateChallengeDto,
    creatorId: number,
  ) {
    await this.assertClubResponsible(clubId, creatorId);
    if (!dto.title?.trim() || !dto.description?.trim() || !dto.rules?.trim()) {
      throw new BadRequestException(
        'Titre, description et consignes (rules) sont requis.',
      );
    }
    const dueDate = new Date(dto.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException('Date limite (dueDate) invalide.');
    }

    const challenge = await this.prisma.challenge.create({
      data: {
        clubId,
        createdById: creatorId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        rules: dto.rules.trim(),
        rewardBadgeType: dto.rewardBadgeType?.trim() || null,
        dueDate,
      },
    });
    return { success: true, data: challenge };
  }

  /** Liste des challenges d'un club. */
  async listByClub(clubId: string) {
    const challenges = await this.prisma.challenge.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
    return {
      success: true,
      data: challenges.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        dueDate: c.dueDate,
        status: c.status,
        rewardBadgeType: c.rewardBadgeType,
        submissionCount: c._count.submissions,
      })),
    };
  }

  /** Détail d'un challenge avec ses soumissions. */
  async getById(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        submissions: {
          include: {
            member: { select: { id: true, firstname: true, lastname: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!challenge) {
      throw new NotFoundException('Challenge introuvable.');
    }
    return {
      success: true,
      data: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        rules: challenge.rules,
        dueDate: challenge.dueDate,
        status: challenge.status,
        rewardBadgeType: challenge.rewardBadgeType,
        submissions: challenge.submissions.map((s) => ({
          id: s.id,
          memberId: s.memberId,
          memberName: `${s.member.firstname} ${s.member.lastname}`,
          fileUrl: s.fileUrl,
          grade: s.grade,
          feedback: s.feedback,
          isWinner: s.isWinner,
        })),
      },
    };
  }

  /** Soumission d'une solution par un membre (avant la date limite). */
  async submit(challengeId: string, dto: SubmitDto, memberId: number) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new NotFoundException('Challenge introuvable.');
    }
    if (challenge.status !== 'OPEN') {
      throw new BadRequestException('Ce challenge est clôturé.');
    }
    if (new Date() > challenge.dueDate) {
      throw new BadRequestException('La date limite est dépassée.');
    }
    if (!dto.fileUrl?.trim()) {
      throw new BadRequestException('Un lien de rendu (fileUrl) est requis.');
    }

    const submission = await this.prisma.challengeSubmission.upsert({
      where: { challengeId_memberId: { challengeId, memberId } },
      update: { fileUrl: dto.fileUrl.trim() },
      create: { challengeId, memberId, fileUrl: dto.fileUrl.trim() },
    });
    return { success: true, data: submission };
  }

  /** Évaluation d'une soumission (note + commentaire) par le jury. */
  async evaluate(
    challengeId: string,
    submissionId: string,
    dto: EvaluateDto,
    requesterId: number,
  ) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new NotFoundException('Challenge introuvable.');
    }
    await this.assertClubResponsible(challenge.clubId, requesterId);

    const submission = await this.prisma.challengeSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission || submission.challengeId !== challengeId) {
      throw new NotFoundException('Soumission introuvable pour ce challenge.');
    }

    let grade: number | undefined;
    if (dto.grade !== undefined && dto.grade !== null) {
      grade = Number(dto.grade);
      if (!Number.isFinite(grade) || grade < 0) {
        throw new BadRequestException('Note invalide (nombre positif attendu).');
      }
    }

    const updated = await this.prisma.challengeSubmission.update({
      where: { id: submissionId },
      data: {
        grade,
        feedback: dto.feedback?.trim() ?? undefined,
      },
    });

    await this.prisma.notification.create({
      data: {
        memberId: submission.memberId,
        title: 'Soumission évaluée',
        message: `Votre soumission au challenge « ${challenge.title} » a été évaluée.`,
      },
    });

    return { success: true, data: updated };
  }

  /**
   * Clôture d'un challenge : désigne les gagnants, leur attribue le badge de
   * récompense configuré et les notifie — le tout dans une transaction.
   */
  async close(
    challengeId: string,
    dto: CloseChallengeDto,
    requesterId: number,
  ) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new NotFoundException('Challenge introuvable.');
    }
    await this.assertClubResponsible(challenge.clubId, requesterId);
    if (challenge.status === 'CLOSED') {
      throw new BadRequestException('Ce challenge est déjà clôturé.');
    }

    const winnerIds = Array.isArray(dto.winnerMemberIds)
      ? [...new Set(dto.winnerMemberIds.map(Number).filter(Number.isInteger))]
      : [];

    const awarded: number[] = [];
    await this.prisma.$transaction(async (tx) => {
      await tx.challenge.update({
        where: { id: challengeId },
        data: { status: 'CLOSED' },
      });

      if (winnerIds.length > 0) {
        const winners = await tx.challengeSubmission.findMany({
          where: { challengeId, memberId: { in: winnerIds } },
          include: {
            member: { select: { firstname: true, lastname: true } },
          },
        });
        for (const w of winners) {
          await tx.challengeSubmission.update({
            where: { id: w.id },
            data: { isWinner: true },
          });
          if (challenge.rewardBadgeType) {
            await tx.badge.create({
              data: {
                userId: w.memberId,
                badgeType: challenge.rewardBadgeType,
                userName: `${w.member.firstname} ${w.member.lastname}`,
                awardedBy: `Challenge : ${challenge.title}`,
              },
            });
          }
          await tx.notification.create({
            data: {
              memberId: w.memberId,
              title: 'Félicitations 🏆',
              message:
                `Vous avez remporté le challenge « ${challenge.title} »` +
                (challenge.rewardBadgeType
                  ? ` et le badge ${challenge.rewardBadgeType}.`
                  : '.'),
            },
          });
          awarded.push(w.memberId);
        }
      }
    });

    this.logger.log(
      `Challenge ${challengeId} clôturé — gagnants : ${awarded.join(', ') || 'aucun'}.`,
    );
    return {
      success: true,
      data: { challengeId, status: 'CLOSED', winners: awarded },
    };
  }
}
