import { SetMetadata } from '@nestjs/common';

export const UNIVERSITY_POSTS_KEY = 'universityPosts';

/**
 * Restreint une route aux membres portant l'un des postes administratifs
 * universitaires indiqués (ex: "TRESORIER", "CHEF_UNIVERSITAIRE"), scopé à
 * l'université ciblée par le paramètre de route (`:id` ou `:universityId`).
 *
 * À utiliser avec `UniversityPostGuard`. Un ADMIN global contourne le scope.
 */
export const UniversityPosts = (...posts: string[]) =>
  SetMetadata(UNIVERSITY_POSTS_KEY, posts);
