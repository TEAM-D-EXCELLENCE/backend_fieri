import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../authenticated-request';

/**
 * Règle unique : qui a autorité sur un projet ?
 *
 * Son porteur, le responsable du club auquel il est rattaché, ou un ADMIN.
 * Cette réponse gouverne le projet lui-même comme tout ce qui en dépend (ses
 * tâches) : la règle vit ici une seule fois pour que les deux ne puissent pas
 * diverger.
 *
 * Renvoie `null` quand le projet n'existe pas — c'est un fait distinct d'un
 * refus, et l'appelant décide de la réponse HTTP à en tirer.
 */
export async function aAutoriteSurProjet(
  prisma: PrismaService,
  user: AuthUser,
  projectId: string,
): Promise<boolean | null> {
  if (user.role === 'ADMIN') {
    return true;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, clubId: true },
  });
  if (!project) {
    return null;
  }
  if (project.ownerId === user.id) {
    return true;
  }
  if (project.clubId) {
    const club = await prisma.club.findUnique({
      where: { id: project.clubId },
      select: { responsibleId: true },
    });
    if (club?.responsibleId === user.id) {
      return true;
    }
  }
  return false;
}
