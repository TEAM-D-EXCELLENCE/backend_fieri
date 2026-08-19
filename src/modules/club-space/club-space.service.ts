import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClubScopeService } from '../../common/club-scope/club-scope.service';

export interface CreateActivityDto {
  title: string;
  description?: string;
  memberId: number;
  dueDate?: string;
}

export interface SubmitReportDto {
  period: string;
  title: string;
  content: string;
}

const ACTIVITY_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

@Injectable()
export class ClubSpaceService {
  private readonly logger = new Logger(ClubSpaceService.name);

  constructor(
    private prisma: PrismaService,
    private clubScope: ClubScopeService,
  ) {}

  /**
   * Charge le club visé. L'autorisation (« responsable du club ») est portée
   * en amont par `ClubManagerGuard` : ce service ne la revérifie pas.
   */
  private async loadClub(clubId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club introuvable.');
    }
    return club;
  }

  /** Liste des membres actifs d'un club (Responsable / Secrétaire / ADMIN). */
  async getMembersList(clubId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club introuvable.');
    }
    const memberships = await this.prisma.clubMembership.findMany({
      where: { clubId, status: 'APPROVED' },
      include: {
        member: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: {
        clubId,
        clubName: club.name,
        count: memberships.length,
        members: memberships.map((m) => ({
          memberId: m.member.id,
          name: `${m.member.firstname} ${m.member.lastname}`,
          email: m.member.email,
          role: m.role,
          branch: m.member.branch?.name ?? null,
          interviewAt: m.interviewAt,
          cardGeneratedAt: m.cardGeneratedAt,
        })),
      },
    };
  }

  /**
   * Fige la liste des membres actifs et la soumet à la Secrétaire pour
   * recensement (snapshot immuable).
   */
  async submitCensus(clubId: string, submitterId: number) {
    const club = await this.loadClub(clubId);
    const universityId = await this.clubScope.getClubUniversityId(clubId);
    if (!universityId) {
      throw new BadRequestException(
        "Impossible de déterminer l'université du club (aucun responsable ni membre rattaché).",
      );
    }

    const memberships = await this.prisma.clubMembership.findMany({
      where: { clubId, status: 'APPROVED' },
      include: {
        member: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });
    const snapshot = memberships.map((m) => ({
      id: m.member.id,
      name: `${m.member.firstname} ${m.member.lastname}`,
      email: m.member.email,
    }));

    const census = await this.prisma.membershipCensus.create({
      data: {
        clubId,
        universityId,
        submittedById: submitterId,
        memberCount: snapshot.length,
        snapshot,
        status: 'SUBMITTED',
      },
    });

    const secretary = await this.prisma.universityPost.findFirst({
      where: { universityId, post: 'SECRETAIRE' },
      select: { memberId: true },
    });
    if (secretary) {
      await this.prisma.notification.create({
        data: {
          memberId: secretary.memberId,
          title: 'Nouveau recensement de club',
          message: `Le club « ${club.name} » a soumis ${snapshot.length} membre(s) pour recensement.`,
        },
      });
    } else {
      this.logger.warn(
        `Aucune Secrétaire pour l'université ${universityId} — recensement ${census.id} non notifié.`,
      );
    }

    return {
      success: true,
      data: {
        censusId: census.id,
        memberCount: snapshot.length,
        status: census.status,
      },
    };
  }

  /** Création d'une activité assignée à un membre du club (Responsable/ADMIN). */
  async createAssignedActivity(clubId: string, dto: CreateActivityDto) {
    const club = await this.loadClub(clubId);
    if (!dto.title?.trim()) {
      throw new BadRequestException('Un titre d’activité est requis.');
    }
    const memberId = Number(dto.memberId);
    if (!Number.isInteger(memberId)) {
      throw new BadRequestException('memberId invalide.');
    }
    const membership = await this.prisma.clubMembership.findUnique({
      where: { clubId_memberId: { clubId, memberId } },
    });
    if (!membership || membership.status !== 'APPROVED') {
      throw new BadRequestException(
        'Le membre ne fait pas partie de ce club (adhésion approuvée requise).',
      );
    }

    let dueDate: Date | null = null;
    if (dto.dueDate) {
      dueDate = new Date(dto.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        throw new BadRequestException('dueDate invalide.');
      }
    }

    const activity = await this.prisma.assignedActivity.create({
      data: {
        clubId,
        memberId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        dueDate,
      },
    });

    await this.prisma.notification.create({
      data: {
        memberId,
        title: 'Nouvelle activité assignée',
        message: `Une activité « ${activity.title} » vous a été assignée dans le club ${club.name}.`,
      },
    });

    return { success: true, data: activity };
  }

  /** Mise à jour du statut d'une activité (membre assigné, responsable ou ADMIN). */
  async updateActivityStatus(activityId: string, status: string) {
    if (!ACTIVITY_STATUSES.includes(status)) {
      throw new BadRequestException(
        `Statut invalide. Valeurs autorisées : ${ACTIVITY_STATUSES.join(', ')}.`,
      );
    }
    const activity = await this.prisma.assignedActivity.findUnique({
      where: { id: activityId },
      include: { club: { select: { responsibleId: true } } },
    });
    if (!activity) {
      throw new NotFoundException('Activité introuvable.');
    }
    const updated = await this.prisma.assignedActivity.update({
      where: { id: activityId },
      data: { status },
    });
    return { success: true, data: updated };
  }

  /**
   * Tableau de bord du membre : activités opérationnelles assignées +
   * projets de recherche actifs auxquels il participe.
   */
  async getMyDashboard(memberId: number) {
    const activities = await this.prisma.assignedActivity.findMany({
      where: { memberId },
      include: { club: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const [owned, follows] = await Promise.all([
      this.prisma.project.findMany({ where: { ownerId: memberId } }),
      this.prisma.projectFollow.findMany({
        where: { memberId },
        include: { project: true },
      }),
    ]);
    const projectsById = new Map<
      string,
      { id: string; title: string; status: string; role: string }
    >();
    for (const p of owned) {
      projectsById.set(p.id, {
        id: p.id,
        title: p.title,
        status: p.status,
        role: 'OWNER',
      });
    }
    for (const f of follows) {
      if (!projectsById.has(f.project.id)) {
        projectsById.set(f.project.id, {
          id: f.project.id,
          title: f.project.title,
          status: f.project.status,
          role: 'FOLLOWER',
        });
      }
    }

    return {
      success: true,
      data: {
        assignedActivities: activities.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          status: a.status,
          dueDate: a.dueDate,
          club: a.club,
        })),
        projects: [...projectsById.values()],
      },
    };
  }

  /** Historique des recensements d'une université (Secrétaire / ADMIN). */
  async getCensusHistory(universityId: number) {
    const university = await this.prisma.university.findUnique({
      where: { id: universityId },
    });
    if (!university) {
      throw new NotFoundException('Université introuvable.');
    }
    const censuses = await this.prisma.membershipCensus.findMany({
      where: { universityId },
      include: {
        club: { select: { name: true } },
        submittedBy: { select: { firstname: true, lastname: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      data: censuses.map((c) => ({
        id: c.id,
        clubName: c.club.name,
        memberCount: c.memberCount,
        status: c.status,
        submittedBy: `${c.submittedBy.firstname} ${c.submittedBy.lastname}`,
        snapshot: c.snapshot,
        validatedAt: c.validatedAt,
        createdAt: c.createdAt,
      })),
    };
  }

  /** Validation administrative d'un recensement (Secrétaire / ADMIN). */
  async validateCensus(
    universityId: number,
    censusId: string,
    validatorId: number,
  ) {
    const census = await this.prisma.membershipCensus.findUnique({
      where: { id: censusId },
    });
    if (!census || census.universityId !== universityId) {
      throw new NotFoundException(
        'Recensement introuvable pour cette université.',
      );
    }
    if (census.status === 'VALIDATED') {
      throw new BadRequestException('Ce recensement est déjà validé.');
    }

    const updated = await this.prisma.membershipCensus.update({
      where: { id: censusId },
      data: {
        status: 'VALIDATED',
        validatedById: validatorId,
        validatedAt: new Date(),
      },
    });

    await this.prisma.notification.create({
      data: {
        memberId: census.submittedById,
        title: 'Recensement validé',
        message: `Votre recensement du ${census.createdAt.toLocaleDateString('fr-FR')} a été validé administrativement.`,
      },
    });

    return {
      success: true,
      data: { censusId: updated.id, status: updated.status },
    };
  }

  /**
   * Soumission du rapport mensuel d'activité & de recherche par le Responsable
   * de Club à la Secrétaire de l'université.
   */
  async submitActivityReport(
    clubId: string,
    dto: SubmitReportDto,
    authorId: number,
  ) {
    const club = await this.loadClub(clubId);
    if (!dto.period?.trim() || !dto.title?.trim() || !dto.content?.trim()) {
      throw new BadRequestException(
        'Période, titre et contenu du rapport sont requis.',
      );
    }
    const universityId = await this.clubScope.getClubUniversityId(clubId);
    if (!universityId) {
      throw new BadRequestException(
        "Impossible de déterminer l'université du club.",
      );
    }

    const report = await this.prisma.activityReport.create({
      data: {
        clubId,
        universityId,
        authorId,
        period: dto.period.trim(),
        title: dto.title.trim(),
        content: dto.content.trim(),
      },
    });

    const secretary = await this.prisma.universityPost.findFirst({
      where: { universityId, post: 'SECRETAIRE' },
      select: { memberId: true },
    });
    if (secretary) {
      await this.prisma.notification.create({
        data: {
          memberId: secretary.memberId,
          title: 'Nouveau rapport d’activité',
          message: `Le club « ${club.name} » a soumis un rapport (${dto.period.trim()}).`,
        },
      });
    }

    return {
      success: true,
      data: { reportId: report.id, period: report.period },
    };
  }

  /** Rapports d'activité d'un club (Responsable / Secrétaire / ADMIN). */
  async listClubReports(clubId: string) {
    const reports = await this.prisma.activityReport.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { firstname: true, lastname: true } } },
    });
    return {
      success: true,
      data: reports.map((r) => ({
        id: r.id,
        period: r.period,
        title: r.title,
        content: r.content,
        author: `${r.author.firstname} ${r.author.lastname}`,
        createdAt: r.createdAt,
      })),
    };
  }

  /** Tous les rapports d'activité d'une université (Secrétaire / ADMIN). */
  async listUniversityReports(universityId: number) {
    const university = await this.prisma.university.findUnique({
      where: { id: universityId },
    });
    if (!university) {
      throw new NotFoundException('Université introuvable.');
    }
    const reports = await this.prisma.activityReport.findMany({
      where: { universityId },
      orderBy: { createdAt: 'desc' },
      include: {
        club: { select: { name: true } },
        author: { select: { firstname: true, lastname: true } },
      },
    });
    return {
      success: true,
      data: reports.map((r) => ({
        id: r.id,
        clubName: r.club.name,
        period: r.period,
        title: r.title,
        content: r.content,
        author: `${r.author.firstname} ${r.author.lastname}`,
        createdAt: r.createdAt,
      })),
    };
  }
}
