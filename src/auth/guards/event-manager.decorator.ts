import { SetMetadata } from '@nestjs/common';

export const EVENT_POSTS_KEY = 'eventPosts';

/**
 * Postes universitaires habilités à gérer l'événement visé, en plus de son
 * organisateur, du responsable du club porteur et des ADMIN.
 */
export const EventPosts = (...posts: string[]) =>
  SetMetadata(EVENT_POSTS_KEY, posts);
