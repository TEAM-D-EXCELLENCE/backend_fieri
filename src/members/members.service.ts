import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

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
      // Griffe officielle apposée sur les attestations : le front en a besoin
      // pour savoir si le Chef Universitaire en a déjà déposé une.
      signatureUrl: member.signatureUrl,
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
    const where: Prisma.MemberWhereInput = {};

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
          ? {
              post: m.universityPost.post,
              universityId: m.universityPost.universityId,
            }
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

  // ─── Postes de gouvernance scopés ───────────────────────────────────────
  // Deuxième axe du modèle d'accès : ce que la personne ADMINISTRE, et où.
  // Ces postes gouvernent l'essentiel de la navigation côté client, et aucun
  // écran ne permettait de les attribuer — seul le rôle linéaire l'était.
  static readonly UNIVERSITY_POSTS = [
    'CHEF_UNIVERSITAIRE',
    'SECRETAIRE',
    'TRESORIER',
    'RESP_COMMUNICATION',
  ];

  static readonly COUNTRY_POSTS = ['GOUVERNANT_PAYS'];

  /**
   * Attribue, remplace ou retire le poste d'université d'un membre.
   * `post: null` retire le poste. Un membre n'en a qu'un (memberId @unique).
   */
  async setUniversityPost(
    memberId: number,
    post: string | null,
    universityId: number,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }

    if (post === null) {
      await this.prisma.universityPost.deleteMany({ where: { memberId } });
      return {
        success: true,
        message: "Poste d'université retiré.",
        data: { id: memberId, universityPost: null },
      };
    }

    if (!MembersService.UNIVERSITY_POSTS.includes(post)) {
      throw new BadRequestException(
        `Poste invalide. Valeurs acceptées : ${MembersService.UNIVERSITY_POSTS.join(', ')}`,
      );
    }

    const university = await this.prisma.university.findUnique({
      where: { id: universityId },
    });
    if (!university) {
      throw new NotFoundException('Université non trouvée');
    }

    // Un seul titulaire par poste et par université : attribuer le poste le
    // retire à son précédent titulaire, plutôt que d'en laisser deux en place.
    await this.prisma.universityPost.deleteMany({
      where: { universityId, post, NOT: { memberId } },
    });

    const saved = await this.prisma.universityPost.upsert({
      where: { memberId },
      create: { memberId, universityId, post },
      update: { universityId, post },
    });

    return {
      success: true,
      message: 'Poste attribué avec succès.',
      data: {
        id: memberId,
        universityPost: { post: saved.post, universityId: saved.universityId },
      },
    };
  }

  /** Idem pour le poste national. */
  async setCountryPost(
    memberId: number,
    post: string | null,
    countryId: number,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }

    if (post === null) {
      await this.prisma.countryPost.deleteMany({ where: { memberId } });
      return {
        success: true,
        message: 'Poste national retiré.',
        data: { id: memberId, countryPost: null },
      };
    }

    if (!MembersService.COUNTRY_POSTS.includes(post)) {
      throw new BadRequestException(
        `Poste invalide. Valeurs acceptées : ${MembersService.COUNTRY_POSTS.join(', ')}`,
      );
    }

    const country = await this.prisma.country.findUnique({
      where: { id: countryId },
    });
    if (!country) {
      throw new NotFoundException('Pays non trouvé');
    }

    await this.prisma.countryPost.deleteMany({
      where: { countryId, post, NOT: { memberId } },
    });

    const saved = await this.prisma.countryPost.upsert({
      where: { memberId },
      create: { memberId, countryId, post },
      update: { countryId, post },
    });

    return {
      success: true,
      message: 'Poste national attribué avec succès.',
      data: {
        id: memberId,
        countryPost: { post: saved.post, countryId: saved.countryId },
      },
    };
  }

  // `_adminId` : identité de l'administrateur à l'origine du changement,
  // transmise par le contrôleur et conservée pour un futur journal d'audit.
  async updateMemberRole(memberId: number, newRole: string, _adminId: number) {
    const validRoles = [
      'ETUDIANT',
      'CHERCHEUR',
      'CHEF_DE_PROJET',
      'MENTOR',
      'RESPONSABLE',
      'ADMIN',
    ];

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
