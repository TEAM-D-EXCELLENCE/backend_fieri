import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

    const requester = await this.prisma.member.findUnique({
      where: { id: requesterId },
    });
    if (!requester) {
      throw new UnauthorizedException('Demandeur introuvable.');
    }

    // Autorisation : ADMIN, ou responsable d'un club auquel appartient le membre.
    let authorized = requester.role === 'ADMIN';
    if (!authorized) {
      const targetClubIds = target.clubMemberships.map((m) => m.clubId);
      if (targetClubIds.length > 0) {
        const club = await this.prisma.club.findFirst({
          where: { responsibleId: requesterId, id: { in: targetClubIds } },
          select: { id: true },
        });
        authorized = !!club;
      }
    }
    if (!authorized) {
      throw new ForbiddenException(
        "Vous devez être responsable d'un club de ce membre (ou administrateur).",
      );
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
              `${requester.firstname} ${requester.lastname} demande l’exclusion de ` +
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
      throw new BadRequestException(
        'Le champ "approve" (booléen) est requis.',
      );
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

    const requester = await this.prisma.member.findUnique({
      where: { id: requesterId },
    });
    if (!requester) {
      throw new UnauthorizedException('Validateur introuvable.');
    }

    // Autorisation : ADMIN, ou Chef Universitaire de l'université du membre.
    let authorized = requester.role === 'ADMIN';
    if (!authorized) {
      const post = await this.prisma.universityPost.findUnique({
        where: { memberId: requesterId },
      });
      authorized =
        !!post &&
        post.post === 'CHEF_UNIVERSITAIRE' &&
        post.universityId === target.branch?.universityId;
    }
    if (!authorized) {
      throw new ForbiddenException(
        'Seul le Chef Universitaire du membre (ou un administrateur) peut valider.',
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
  async toggleEmblematic(
    targetMemberId: number,
    isEmblematic: boolean,
    requesterId: number,
  ) {
    const target = await this.prisma.member.findUnique({
      where: { id: targetMemberId },
    });
    if (!target) {
      throw new NotFoundException('Membre introuvable.');
    }

    const requester = await this.prisma.member.findUnique({
      where: { id: requesterId },
      include: { universityPost: true },
    });
    if (!requester) {
      throw new UnauthorizedException('Utilisateur non identifié.');
    }

    const isAdmin = requester.role === 'ADMIN';
    const isChef = requester.universityPost?.post === 'CHEF_UNIVERSITAIRE';
    if (!isAdmin && !isChef) {
      throw new ForbiddenException(
        'Action réservée aux Chefs Universitaires et Administrateurs.',
      );
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
  async listEmblematicMembers(universityId?: number) {
    const where: any = { isEmblematic: true, isActive: true };
    if (universityId) {
      where.branch = { universityId };
    }

    const members = await this.prisma.member.findMany({
      where,
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        role: true,
        bio: true,
        avatarUrl: true,
        isEmblematic: true,
        branch: {
          select: { name: true, university: { select: { id: true, name: true } } },
        },
      },
      orderBy: { lastname: 'asc' },
    });

    return {
      success: true,
      data: members.map((m) => ({
        id: m.id,
        name: `${m.firstname} ${m.lastname}`,
        email: m.email,
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
