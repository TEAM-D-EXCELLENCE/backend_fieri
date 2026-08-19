import { SetMetadata } from '@nestjs/common';

export const RESOURCE_OWNER_KEY = 'resourceOwner';

/** Ressources dont on sait vérifier la propriété de façon générique. */
export type OwnedResource = 'news' | 'opportunity' | 'notification';

export interface ResourceOwnerSource {
  /** Ressource visée, telle que nommée dans le client Prisma. */
  resource: OwnedResource;
  /** Paramètre d'URL portant son identifiant (défaut : `id`). */
  param?: string;
  /** Un ADMIN passe outre la propriété (défaut : true). */
  adminBypass?: boolean;
}

export const ResourceOwner = (source: ResourceOwnerSource) =>
  SetMetadata(RESOURCE_OWNER_KEY, source);
