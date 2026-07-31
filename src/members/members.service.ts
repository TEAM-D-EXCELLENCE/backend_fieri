import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Profil complet d'un membre, incluant le SCOPE de gouvernance nécessaire au
   * contrôle d'accès côté frontend :
   *  - université/pays déduits de la branche,
   *  - poste universitaire (TRESORIER, CHEF_UNIVERSITAIRE, SECRETAIRE, RESP_COMMUNICATION),
   *  - poste pays (GOUVERNANT_PAYS),
   *  - clubs dont le membre est responsable,
   *  - adhésions de club (avec rôle interne).
   */
  async getMemberById(id: number) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        branch: {
          include: { university: { include: { country: true } } },
        },
        universityPost: true,
        countryPost: true,
        responsibleOfClubs: { select: { id: true } },
        clubMemberships: {
          select: { clubId: true, role: true, status: true },
        },
      },
    });
    if (!member) return null;

    const university = member.branch?.university ?? null;
    const country = university?.country ?? null;

    return {
      id: member.id,
      email: member.email,
      firstName: member.firstname,
      lastName: member.lastname,
      role: member.role,
      branchId: member.branchId,
      isEmblematic: member.isEmblematic,
      avatarUrl: member.avatarUrl,
      bio: member.bio,
      skills: member.skills,
      distinctions: member.distinctions,
      // Scope géographique déduit
      universityId: university?.id ?? null,
      universityName: university?.name ?? null,
      countryId: country?.id ?? null,
      countryName: country?.name ?? null,
      // Postes de gouvernance scopés
      universityPost: member.universityPost
        ? {
            post: member.universityPost.post,
            universityId: member.universityPost.universityId,
          }
        : null,
      countryPost: member.countryPost
        ? {
            post: member.countryPost.post,
            countryId: member.countryPost.countryId,
          }
        : null,
      responsibleClubIds: member.responsibleOfClubs.map((c) => c.id),
      clubMemberships: member.clubMemberships,
      createdAt: member.createdAt,
    };
  }

  async getMembers(params: {
    search?: string;
    role?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};

    if (params.search) {
      where.OR = [
        { firstname: { contains: params.search, mode: 'insensitive' } },
        { lastname: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.role) {
      where.role = params.role;
    }

    const skip = (params.page - 1) * params.limit;

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          universityPost: true,
          countryPost: true,
          responsibleOfClubs: { select: { id: true } },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      success: true,
      data: members.map((m) => ({
        id: m.id,
        firstName: m.firstname,
        lastName: m.lastname,
        email: m.email,
        role: m.role,
        branchId: m.branchId,
        isEmblematic: m.isEmblematic,
        universityPost: m.universityPost
          ? { post: m.universityPost.post, universityId: m.universityPost.universityId }
          : null,
        countryPost: m.countryPost
          ? { post: m.countryPost.post, countryId: m.countryPost.countryId }
          : null,
        responsibleClubIds: m.responsibleOfClubs?.map((c) => c.id) || [],
        createdAt: m.createdAt,
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async updateMemberRole(
    memberId: number,
    newRole: string,
    adminId: number,
  ) {
    const validRoles = ['ETUDIANT', 'CHERCHEUR', 'CHEF_DE_PROJET', 'MENTOR', 'RESPONSABLE', 'ADMIN'];

    if (!validRoles.includes(newRole)) {
      throw new BadRequestException(
        `Rôle invalide. Valeurs acceptées : ${validRoles.join(', ')}`,
      );
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }

    // Empêcher de retirer le dernier ADMIN
    if (member.role === 'ADMIN' && newRole !== 'ADMIN') {
      const adminCount = await this.prisma.member.count({
        where: { role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Impossible de retirer le rôle ADMIN au dernier administrateur de la plateforme.',
        );
      }
    }

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    return {
      success: true,
      message: 'Rôle mis à jour avec succès.',
      data: {
        id: updated.id,
        role: updated.role,
      },
    };
  }
}
