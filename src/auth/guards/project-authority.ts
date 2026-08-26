import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../authenticated-request';

/** Niveaux d'autorité sur un projet, du plus faible au plus fort. */
export type AutoriteProjet = 'aucune' | 'lecture' | 'ecriture';

/**
 * Règle unique : quelle autorité un membre a-t-il sur un projet ?
 *
 * - `ecriture` — son porteur, le responsable du club de rattachement, un ADMIN.
 * - `lecture` — un membre approuvé de ce club : le travail du club le regarde,
 *   il ne le décide pas.
 * - `aucune` — tous les autres. Suivre un projet ou l'avoir soutenu n'est pas
 *   y travailler : ces liens n'ouvrent rien.
 *
 * Un projet sans club n'a pas d'équipe vérifiable — `Project.team` est une
 * liste de noms libres, pas de comptes. Seul son porteur y a donc autorité.
 *
 * Cette réponse gouverne le projet lui-même comme tout ce qui en dépend (ses
 * tâches) : la règle vit ici une seule fois pour que les deux ne puissent pas
 * diverger.
 *
 * Renvoie `null` quand le projet n'existe pas — c'est un fait distinct d'un
 * refus, et l'appelant décide de la réponse HTTP à en tirer.
 */
export async function autoriteSurProjet(
  prisma: PrismaService,
  user: AuthUser,
  projectId: string,
): Promise<AutoriteProjet | null> {
  if (user.role === 'ADMIN') {
    return 'ecriture';
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, clubId: true },
  });
  if (!project) {
    return null;
  }
  if (project.ownerId === user.id) {
    return 'ecriture';
  }
  if (!project.clubId) {
    return 'aucune';
  }

  const club = await prisma.club.findUnique({
    where: { id: project.clubId },
    select: { responsibleId: true },
  });
  if (club?.responsibleId === user.id) {
    return 'ecriture';
  }

  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_memberId: { clubId: project.clubId, memberId: user.id } },
    select: { status: true },
  });
  return membership?.status === 'APPROVED' ? 'lecture' : 'aucune';
}
