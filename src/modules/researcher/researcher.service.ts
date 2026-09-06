import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseProjectTeam } from '../../common/project-team';

@Injectable()
export class ResearcherService {
  constructor(private prisma: PrismaService) {}

  async getResearchers() {
    // On compte les abonnés côté SQL (`_count`) au lieu de charger toutes les
    // lignes de `followers` en mémoire uniquement pour en faire `.length`.
    const members = await this.prisma.member.findMany({
      select: {
        id: true,
        firstname: true,
        lastname: true,
        role: true,
        bio: true,
        skills: true,
        _count: { select: { followers: true } },
      },
    });

    const data = members.map((m) => ({
      id: m.id,
      firstName: m.firstname,
      lastName: m.lastname,
      role: m.role,
      bio: m.bio || '',
      skills: m.skills,
      followers: m._count.followers,
    }));

    return {
      success: true,
      data,
    };
  }

  async getResearcherById(id: number) {
    const member = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException('Chercheur non trouvé');
    }

    // Projets où le membre figure dans l'équipe. L'appartenance est stockée par
    // NOM dans le blob JSON `team`, sans relation dédiée : le rapprochement se
    // fait donc en mémoire. On ne remonte cependant QUE `id` et `team` (au lieu
    // de toute la ligne : résumé, description, technologies, horodatages…), ce
    // qui évite de charger les colonnes lourdes de chaque projet à l'affichage
    // d'un profil.
    //
    // Un filtre 100 % SQL (jsonb) est écarté sciemment : le champ `team` est
    // d'encodage mixte en base (tableau pour la plupart des lignes, chaîne
    // double-encodée pour d'anciennes), ce que `parseProjectTeam` absorbe mais
    // qu'un `jsonb_array_elements` brut ferait planter. La vraie mise à
    // l'échelle passerait par une table de jonction membre↔projet.
    const allProjects = await this.prisma.project.findMany({
      select: { id: true, team: true },
    });
    const researcherName =
      `${member.firstname} ${member.lastname}`.toLowerCase();

    const projects = allProjects
      .filter((p) =>
        parseProjectTeam(p.team).some(
          (t) => t.name?.toLowerCase() === researcherName,
        ),
      )
      .map((p) => p.id);

    return {
      success: true,
      data: {
        id: member.id,
        firstName: member.firstname,
        lastName: member.lastname,
        bio: member.bio || '',
        skills: member.skills,
        projects,
        distinctions: member.distinctions,
      },
    };
  }

  async getResearcherDistinctions(id: number) {
    const member = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException('Chercheur non trouvé');
    }

    const badges = await this.prisma.badge.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: {
        distinctions: member.distinctions,
        badges: badges.map((b) => ({
          id: b.id,
          badgeType: b.badgeType,
          userName: b.userName,
          awardedBy: b.awardedBy,
          createdAt: b.createdAt,
        })),
      },
    };
  }

  async getMyResearcherProfile(id: number) {
    const member = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }

    return {
      success: true,
      data: {
        id: member.id,
        bio: member.bio || '',
        skills: member.skills,
        avatarUrl: member.avatarUrl || '',
      },
    };
  }

  async updateMyResearcherProfile(
    id: number,
    data: { bio?: string; skills?: string[]; avatarUrl?: string },
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }

    await this.prisma.member.update({
      where: { id },
      data: {
        bio: data.bio !== undefined ? data.bio : member.bio,
        skills: data.skills !== undefined ? data.skills : member.skills,
        avatarUrl:
          data.avatarUrl !== undefined ? data.avatarUrl : member.avatarUrl,
      },
    });

    return {
      success: true,
      message: 'Fiche de chercheur mise à jour.',
    };
  }

  async toggleFollowResearcher(followerId: number, followingId: number) {
    if (followerId === followingId) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous suivre vous-même.',
      );
    }

    const followingMember = await this.prisma.member.findUnique({
      where: { id: followingId },
    });

    if (!followingMember) {
      throw new NotFoundException('Chercheur non trouvé');
    }

    const existingFollow = await this.prisma.researcherFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    let following = false;
    let message = '';

    if (existingFollow) {
      // Unfollow
      await this.prisma.researcherFollow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });
      following = false;
      message = 'Vous ne suivez plus ce chercheur.';
    } else {
      // Follow
      await this.prisma.researcherFollow.create({
        data: {
          followerId,
          followingId,
        },
      });
      following = true;
      message = 'Vous suivez désormais ce chercheur.';
    }

    return {
      success: true,
      following,
      message,
    };
  }

  async unfollowResearcher(followerId: number, followingId: number) {
    if (followerId === followingId) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous désabonner de vous-même.',
      );
    }

    const followingMember = await this.prisma.member.findUnique({
      where: { id: followingId },
    });

    if (!followingMember) {
      throw new NotFoundException('Chercheur non trouvé');
    }

    const existingFollow = await this.prisma.researcherFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!existingFollow) {
      throw new NotFoundException('Vous ne suivez pas ce chercheur.');
    }

    await this.prisma.researcherFollow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return {
      success: true,
      following: false,
      message: 'Vous ne suivez plus ce chercheur.',
    };
  }
}
