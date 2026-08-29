import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface RequestDeletionDto {
  reason?: string;
}

export interface ConfirmDeletionDto {
  approve: boolean;
}

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Demande d'exclusion d'un membre par un Responsable de Club.
   * Suspend immédiatement l'accès du membre (`deletionRequested = true`) et
   * notifie le Chef Universitaire pour validation.
   */
  async requestDeletion(
    targetMemberId: number,
    dto: RequestDeletionDto,
    requesterId: number,
  ) {
    if (targetMemberId === requesterId) {
      throw new BadRequestException(
        'Vous ne pouvez pas demander votre propre exclusion.',
      );
    }

    const target = await this.prisma.member.findUnique({
      where: { id: targetMemberId },
      include: {
        branch: { select: { universityId: true } },
        clubMemberships: {
          where: { status: 'APPROVED' },
          select: { clubId: true },
        },
      },
    });
    if (!target) {
      throw new NotFoundException('Membre introuvable.');
    }

    if (target.deletionRequested) {
      throw new BadRequestException(
        'Une demande d’exclusion est déjà en cours pour ce membre.',
      );
    }

    await this.prisma.member.update({
      where: { id: targetMemberId },
      data: {
        deletionRequested: true,
        deletionReason: dto.reason?.trim() || null,
        deletionRequestedBy: requesterId,
      },
    });

    // Identité du demandeur, pour le libellé de la notification uniquement :
    // l'autorisation est portée en amont par `MemberGovernanceGuard`.
    const requester = await this.prisma.member.findUnique({
      where: { id: requesterId },
      select: { firstname: true, lastname: true },
    });

    // Notifie le Chef Universitaire du membre.
    const universityId = target.branch?.universityId;
    if (universityId) {
      const chef = await this.prisma.universityPost.findFirst({
        where: { universityId, post: 'CHEF_UNIVERSITAIRE' },
        select: { memberId: true },
      });
      if (chef) {
        await this.prisma.notification.create({
          data: {
            memberId: chef.memberId,
            title: 'Demande d’exclusion de membre',
            message:
              `${requester?.firstname ?? 'Un responsable'} ${requester?.lastname ?? ''}`.trim() +
              ` demande l’exclusion de ` +
              `${target.firstname} ${target.lastname}.` +
              (dto.reason?.trim() ? ` Motif : ${dto.reason.trim()}` : ''),
          },
        });
      } else {
        this.logger.warn(
          `Aucun Chef Universitaire pour l'université ${universityId} — notification d'exclusion non créée.`,
        );
      }
    }

    this.logger.log(
      `Exclusion demandée pour le membre ${targetMemberId} par ${requesterId} — accès suspendu.`,
    );
    return {
      success: true,
      data: {
        memberId: targetMemberId,
        deletionRequested: true,
        accessSuspended: true,
      },
    };
  }

  /**
   * Validation (ou refus) de la demande d'exclusion par le Chef Universitaire.
   *  - approuvée : le compte est archivé (`isActive = false`, accès bloqué) ;
   *  - refusée   : la demande est levée et l'accès du membre est rétabli.
   */
  async confirmDeletion(
    targetMemberId: number,
    dto: ConfirmDeletionDto,
    requesterId: number,
  ) {
    if (typeof dto.approve !== 'boolean') {
      throw new BadRequestException('Le champ "approve" (booléen) est requis.');
    }

    const target = await this.prisma.member.findUnique({
      where: { id: targetMemberId },
      include: { branch: { select: { universityId: true } } },
    });
    if (!target) {
      throw new NotFoundException('Membre introuvable.');
    }
    if (!target.deletionRequested) {
      throw new BadRequestException(
        'Aucune demande d’exclusion en cours pour ce membre.',
      );
    }

    if (dto.approve) {
      await this.prisma.member.update({
        where: { id: targetMemberId },
        data: { isActive: false },
      });
      // Informe le demandeur initial.
      if (target.deletionRequestedBy) {
        await this.prisma.notification.create({
          data: {
            memberId: target.deletionRequestedBy,
            title: 'Exclusion validée',
            message: `L’exclusion de ${target.firstname} ${target.lastname} a été validée et le compte a été archivé.`,
          },
        });
      }
      this.logger.log(
        `Exclusion du membre ${targetMemberId} validée par ${requesterId} — compte archivé.`,
      );
      return {
        success: true,
        data: { memberId: targetMemberId, archived: true, isActive: false },
      };
    }

    // Refus : restauration de l'accès.
    await this.prisma.member.update({
      where: { id: targetMemberId },
      data: {
        deletionRequested: false,
        deletionReason: null,
        deletionRequestedBy: null,
      },
    });
    await this.prisma.notification.create({
      data: {
        memberId: targetMemberId,
        title: 'Accès rétabli',
        message:
          'La demande d’exclusion vous concernant a été refusée. Votre accès est rétabli.',
      },
    });
    this.logger.log(
      `Exclusion du membre ${targetMemberId} refusée par ${requesterId} — accès rétabli.`,
    );
    return {
      success: true,
      data: {
        memberId: targetMemberId,
        deletionRequested: false,
        accessRestored: true,
      },
    };
  }

  /** Demandes d'exclusion en attente pour une université (tableau du Chef). */
  async listDeletionRequests(universityId: number) {
    const university = await this.prisma.university.findUnique({
      where: { id: universityId },
    });
    if (!university) {
      throw new NotFoundException('Université introuvable.');
    }

    const members = await this.prisma.member.findMany({
      where: {
        deletionRequested: true,
        isActive: true,
        branch: { universityId },
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        deletionReason: true,
        deletionRequestedBy: true,
        branch: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Résout les noms des demandeurs.
    const requesterIds = [
      ...new Set(
        members
          .map((m) => m.deletionRequestedBy)
          .filter((id): id is number => id !== null),
      ),
    ];
    const requesters = requesterIds.length
      ? await this.prisma.member.findMany({
          where: { id: { in: requesterIds } },
          select: { id: true, firstname: true, lastname: true },
        })
      : [];
    const requesterById = new Map(
      requesters.map((r) => [r.id, `${r.firstname} ${r.lastname}`]),
    );

    return {
      success: true,
      data: members.map((m) => ({
        memberId: m.id,
        name: `${m.firstname} ${m.lastname}`,
        email: m.email,
        branch: m.branch?.name ?? null,
        reason: m.deletionReason,
        requestedBy: m.deletionRequestedBy
          ? (requesterById.get(m.deletionRequestedBy) ?? null)
          : null,
      })),
    };
  }

  /**
   * Modifie le statut "Figure emblématique" d'un membre (isEmblematic).
   * Réservé aux Chefs Universitaires et Administrateurs.
   */
  async toggleEmblematic(targetMemberId: number, isEmblematic: boolean) {
    const target = await this.prisma.member.findUnique({
      where: { id: targetMemberId },
    });
    if (!target) {
      throw new NotFoundException('Membre introuvable.');
    }

    const updated = await this.prisma.member.update({
      where: { id: targetMemberId },
      data: { isEmblematic },
    });

    return {
      success: true,
      message: isEmblematic
        ? 'Membre défini comme figure emblématique.'
        : 'Statut de figure emblématique retiré.',
      data: {
        id: updated.id,
        isEmblematic: updated.isEmblematic,
      },
    };
  }

  /**
   * Récupère la liste des figures emblématiques (isEmblematic = true).
   */
  /**
   * Annuaire PUBLIC des responsables — qui dirige quoi, et ou.
   *
   * La page « Organisation CITE » reconstituait cette liste depuis
   * `GET /members`, reserve a l'ADMIN : un visiteur comme un membre ordinaire
   * y recevaient un 403, et la page restait vide pour tout le monde sauf un
   * administrateur. Elle affichait pourtant une information publique — les
   * noms des responsables d'universite et de club.
   *
   * Cet endpoint ne renvoie QUE les personnes qui detiennent effectivement une
   * responsabilite : un poste d'universite, un poste de pays, la direction
   * d'un club, ou la distinction de figure emblematique. Pas l'annuaire
   * entier, et surtout pas les adresses e-mail.
   */
  async listLeaders() {
    const members = await this.prisma.member.findMany({
      where: {
        isActive: true,
        deletionRequested: false,
        OR: [
          { universityPost: { isNot: null } },
          { countryPost: { isNot: null } },
          { responsibleOfClubs: { some: {} } },
          { isEmblematic: true },
        ],
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        role: true,
        bio: true,
        avatarUrl: true,
        isEmblematic: true,
        branchId: true,
        universityPost: { select: { post: true, universityId: true } },
        countryPost: { select: { post: true, countryId: true } },
        responsibleOfClubs: { select: { id: true } },
      },
      orderBy: { lastname: 'asc' },
    });

    return {
      success: true,
      data: members.map((m) => ({
        id: m.id,
        firstName: m.firstname,
        lastName: m.lastname,
        role: m.role,
        bio: m.bio,
        avatarUrl: m.avatarUrl,
        isEmblematic: m.isEmblematic,
        branchId: m.branchId,
        universityPost: m.universityPost
          ? {
              post: m.universityPost.post,
              universityId: m.universityPost.universityId,
            }
          : null,
        countryPost: m.countryPost
          ? { post: m.countryPost.post, countryId: m.countryPost.countryId }
          : null,
        responsibleClubIds: m.responsibleOfClubs.map((c) => c.id),
      })),
    };
  }

  async listEmblematicMembers(universityId?: number) {
    const where: Prisma.MemberWhereInput = {
      isEmblematic: true,
      isActive: true,
    };
    if (universityId) {
      where.branch = { universityId };
    }

    const members = await this.prisma.member.findMany({
      where,
      select: {
        id: true,
        firstname: true,
        lastname: true,
        role: true,
        bio: true,
        avatarUrl: true,
        isEmblematic: true,
        branch: {
          select: {
            name: true,
            university: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { lastname: 'asc' },
    });

    return {
      success: true,
      // Pas d'adresse e-mail : cette liste est publique, et aucun ecran ne
      // s'en sert. Une page de presentation n'a pas a distribuer les
      // coordonnees des personnes qu'elle presente.
      data: members.map((m) => ({
        id: m.id,
        name: `${m.firstname} ${m.lastname}`,
        role: m.role,
        bio: m.bio,
        avatarUrl: m.avatarUrl,
        isEmblematic: m.isEmblematic,
        branch: m.branch?.name ?? null,
        universityName: m.branch?.university?.name ?? null,
      })),
    };
  }
}
