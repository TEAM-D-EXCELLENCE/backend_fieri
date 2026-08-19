import { SetMetadata } from '@nestjs/common';

export const CLUB_SOURCE_KEY = 'clubSource';

/**
 * Décrit comment atteindre le club concerné par la route, pour `ClubManagerGuard`.
 *
 * - `param`      : le paramètre d'URL porte directement l'identifiant du club.
 * - `body`       : le corps de requête porte l'identifiant du club.
 * - `through`    : le paramètre porte l'identifiant d'une AUTRE ressource dont on
 *                  déduit le club (un défi, une demande d'adhésion…).
 * - `optional`   : si l'identifiant est absent, la route reste autorisée. Sert au
 *                  cas « projet sans club », où le rattachement est facultatif.
 * - `posts`      : postes universitaires également habilités, sur l'université
 *                  de rattachement du club (ex : la secrétaire).
 */
export interface ClubSource {
  param?: string;
  body?: string;
  through?: 'challenge' | 'clubMembership';
  optional?: boolean;
  posts?: string[];
}

export const ClubFrom = (source: ClubSource) =>
  SetMetadata(CLUB_SOURCE_KEY, source);
