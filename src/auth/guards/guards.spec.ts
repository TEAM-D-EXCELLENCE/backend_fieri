import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClubManagerGuard } from './club-manager.guard';
import { ResourceOwnerGuard } from './resource-owner.guard';
import { ProjectWriteGuard } from './project-write.guard';
import { EventManagerGuard } from './event-manager.guard';
import { MemberGovernanceGuard } from './member-governance.guard';
import { UniversityChiefGuard } from './university-chief.guard';
import { AssignedActivityGuard } from './assigned-activity.guard';
import { UniversityPostGuard } from '../university-post.guard';
import type { AuthUser } from '../authenticated-request';

const ADMIN: AuthUser = {
  id: 1,
  firstname: 'A',
  lastname: 'D',
  email: 'a@d.fr',
  role: 'ADMIN',
};
const MEMBRE: AuthUser = {
  id: 7,
  firstname: 'M',
  lastname: 'B',
  email: 'm@b.fr',
  role: 'ETUDIANT',
};

/** Fabrique un ExecutionContext minimal portant user / params / body. */
function ctx(
  user: AuthUser | undefined,
  params: Record<string, string> = {},
  body: unknown = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params, body }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

/** Reflector renvoyant toujours la même métadonnée. */
function reflector(value: unknown): Reflector {
  return { getAllAndOverride: () => value } as unknown as Reflector;
}

describe('ClubManagerGuard', () => {
  const club = { id: 'c1', responsibleId: 7 };
  const prisma = (responsibleId: number | null) =>
    ({
      club: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            responsibleId === null ? null : { ...club, responsibleId },
          ),
      },
      universityPost: { findUnique: jest.fn().mockResolvedValue(null) },
      challenge: { findUnique: jest.fn().mockResolvedValue({ clubId: 'c1' }) },
      clubMembership: {
        findUnique: jest.fn().mockResolvedValue({ clubId: 'c1' }),
      },
    }) as never;
  const scope = {
    getClubUniversityId: jest.fn().mockResolvedValue(42),
  } as never;

  it('autorise le responsable du club', async () => {
    const g = new ClubManagerGuard(
      reflector({ param: 'id' }),
      prisma(7),
      scope,
    );
    await expect(g.canActivate(ctx(MEMBRE, { id: 'c1' }))).resolves.toBe(true);
  });

  it('refuse un membre qui n’est pas responsable', async () => {
    const g = new ClubManagerGuard(
      reflector({ param: 'id' }),
      prisma(99),
      scope,
    );
    await expect(g.canActivate(ctx(MEMBRE, { id: 'c1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('laisse passer un ADMIN sans consulter le club', async () => {
    const p = prisma(99);
    const g = new ClubManagerGuard(reflector({ param: 'id' }), p, scope);
    await expect(g.canActivate(ctx(ADMIN, { id: 'c1' }))).resolves.toBe(true);
  });

  it('refuse une requête sans utilisateur authentifié', async () => {
    const g = new ClubManagerGuard(
      reflector({ param: 'id' }),
      prisma(7),
      scope,
    );
    await expect(g.canActivate(ctx(undefined, { id: 'c1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuse quand la route ne déclare pas de source de club', async () => {
    const g = new ClubManagerGuard(reflector(undefined), prisma(7), scope);
    await expect(g.canActivate(ctx(MEMBRE, { id: 'c1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('résout le club à travers un défi', async () => {
    const g = new ClubManagerGuard(
      reflector({ param: 'id', through: 'challenge' }),
      prisma(7),
      scope,
    );
    await expect(g.canActivate(ctx(MEMBRE, { id: 'ch1' }))).resolves.toBe(true);
  });

  it('autorise la secrétaire de l’université du club', async () => {
    const p = {
      club: { findUnique: jest.fn().mockResolvedValue({ responsibleId: 99 }) },
      universityPost: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ post: 'SECRETAIRE', universityId: 42 }),
      },
    } as never;
    const g = new ClubManagerGuard(
      reflector({ param: 'id', posts: ['SECRETAIRE'] }),
      p,
      scope,
    );
    await expect(g.canActivate(ctx(MEMBRE, { id: 'c1' }))).resolves.toBe(true);
  });

  it('refuse une secrétaire d’une AUTRE université', async () => {
    const p = {
      club: { findUnique: jest.fn().mockResolvedValue({ responsibleId: 99 }) },
      universityPost: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ post: 'SECRETAIRE', universityId: 999 }),
      },
    } as never;
    const g = new ClubManagerGuard(
      reflector({ param: 'id', posts: ['SECRETAIRE'] }),
      p,
      scope,
    );
    await expect(g.canActivate(ctx(MEMBRE, { id: 'c1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('ResourceOwnerGuard', () => {
  const prismaNews = (authorId: number) =>
    ({
      news: { findUnique: jest.fn().mockResolvedValue({ authorId }) },
    }) as never;

  it('autorise l’auteur de l’article', async () => {
    const g = new ResourceOwnerGuard(
      reflector({ resource: 'news' }),
      prismaNews(7),
    );
    await expect(g.canActivate(ctx(MEMBRE, { id: 'n1' }))).resolves.toBe(true);
  });

  it('refuse un autre membre', async () => {
    const g = new ResourceOwnerGuard(
      reflector({ resource: 'news' }),
      prismaNews(99),
    );
    await expect(g.canActivate(ctx(MEMBRE, { id: 'n1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('laisse passer un ADMIN par défaut', async () => {
    const g = new ResourceOwnerGuard(
      reflector({ resource: 'news' }),
      prismaNews(99),
    );
    await expect(g.canActivate(ctx(ADMIN, { id: 'n1' }))).resolves.toBe(true);
  });

  it('refuse un ADMIN quand adminBypass est désactivé (notifications)', async () => {
    const p = {
      notification: {
        findUnique: jest.fn().mockResolvedValue({ memberId: 99 }),
      },
    } as never;
    const g = new ResourceOwnerGuard(
      reflector({ resource: 'notification', adminBypass: false }),
      p,
    );
    await expect(g.canActivate(ctx(ADMIN, { id: 'x' }))).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('ProjectWriteGuard', () => {
  it('autorise le porteur du projet', async () => {
    const p = {
      project: {
        findUnique: jest.fn().mockResolvedValue({ ownerId: 7, clubId: null }),
      },
    } as never;
    await expect(
      new ProjectWriteGuard(p).canActivate(ctx(MEMBRE, { id: 'p1' })),
    ).resolves.toBe(true);
  });

  it('autorise le responsable du club porteur', async () => {
    const p = {
      project: {
        findUnique: jest.fn().mockResolvedValue({ ownerId: 99, clubId: 'c1' }),
      },
      club: { findUnique: jest.fn().mockResolvedValue({ responsibleId: 7 }) },
    } as never;
    await expect(
      new ProjectWriteGuard(p).canActivate(ctx(MEMBRE, { id: 'p1' })),
    ).resolves.toBe(true);
  });

  it('refuse un tiers', async () => {
    const p = {
      project: {
        findUnique: jest.fn().mockResolvedValue({ ownerId: 99, clubId: 'c1' }),
      },
      club: { findUnique: jest.fn().mockResolvedValue({ responsibleId: 55 }) },
    } as never;
    await expect(
      new ProjectWriteGuard(p).canActivate(ctx(MEMBRE, { id: 'p1' })),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('EventManagerGuard', () => {
  it('autorise l’organisateur', async () => {
    const p = {
      event: {
        findUnique: jest.fn().mockResolvedValue({
          organizerId: 7,
          clubId: null,
          universityId: null,
        }),
      },
    } as never;
    const g = new EventManagerGuard(reflector(['RESP_COMMUNICATION']), p);
    await expect(g.canActivate(ctx(MEMBRE, { id: 'e1' }))).resolves.toBe(true);
  });

  it('autorise le poste déclaré sur la bonne université', async () => {
    const p = {
      event: {
        findUnique: jest.fn().mockResolvedValue({
          organizerId: 99,
          clubId: null,
          universityId: 42,
        }),
      },
      universityPost: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ post: 'RESP_COMMUNICATION', universityId: 42 }),
      },
    } as never;
    const g = new EventManagerGuard(reflector(['RESP_COMMUNICATION']), p);
    await expect(g.canActivate(ctx(MEMBRE, { id: 'e1' }))).resolves.toBe(true);
  });

  it('refuse le même poste sur une autre université', async () => {
    const p = {
      event: {
        findUnique: jest.fn().mockResolvedValue({
          organizerId: 99,
          clubId: null,
          universityId: 42,
        }),
      },
      universityPost: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ post: 'RESP_COMMUNICATION', universityId: 7 }),
      },
    } as never;
    const g = new EventManagerGuard(reflector(['RESP_COMMUNICATION']), p);
    await expect(g.canActivate(ctx(MEMBRE, { id: 'e1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('MemberGovernanceGuard', () => {
  it('autorise le responsable d’un club du membre visé', async () => {
    const p = {
      club: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
    } as never;
    const g = new MemberGovernanceGuard(reflector('club-responsible'), p);
    await expect(g.canActivate(ctx(MEMBRE, { id: '42' }))).resolves.toBe(true);
  });

  it('refuse un responsable d’aucun club du membre visé', async () => {
    const p = {
      club: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never;
    const g = new MemberGovernanceGuard(reflector('club-responsible'), p);
    await expect(g.canActivate(ctx(MEMBRE, { id: '42' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('exige que le chef soit celui de l’université du membre visé', async () => {
    const p = {
      member: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ branch: { universityId: 42 } }),
      },
      universityPost: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ post: 'CHEF_UNIVERSITAIRE', universityId: 999 }),
      },
    } as never;
    const g = new MemberGovernanceGuard(reflector('university-chief'), p);
    await expect(g.canActivate(ctx(MEMBRE, { id: '42' }))).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('UniversityChiefGuard', () => {
  it('autorise un chef universitaire', async () => {
    const p = {
      universityPost: {
        findUnique: jest.fn().mockResolvedValue({ post: 'CHEF_UNIVERSITAIRE' }),
      },
    } as never;
    await expect(
      new UniversityChiefGuard(p).canActivate(ctx(MEMBRE)),
    ).resolves.toBe(true);
  });

  it('refuse un trésorier', async () => {
    const p = {
      universityPost: {
        findUnique: jest.fn().mockResolvedValue({ post: 'TRESORIER' }),
      },
    } as never;
    await expect(
      new UniversityChiefGuard(p).canActivate(ctx(MEMBRE)),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('AssignedActivityGuard', () => {
  it('autorise le membre assigné', async () => {
    const p = {
      assignedActivity: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ memberId: 7, club: { responsibleId: 99 } }),
      },
    } as never;
    await expect(
      new AssignedActivityGuard(p).canActivate(ctx(MEMBRE, { id: 'a1' })),
    ).resolves.toBe(true);
  });

  it('refuse un membre tiers', async () => {
    const p = {
      assignedActivity: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ memberId: 55, club: { responsibleId: 99 } }),
      },
    } as never;
    await expect(
      new AssignedActivityGuard(p).canActivate(ctx(MEMBRE, { id: 'a1' })),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('UniversityPostGuard', () => {
  const CHEF: AuthUser = {
    id: 12,
    firstname: 'C',
    lastname: 'U',
    email: 'c@u.fr',
    role: 'ETUDIANT',
  };

  /** Prisma minimal : le membre existe, avec le poste et l'université donnés. */
  const prisma = (post: string | null, universityId = 7) =>
    ({
      member: {
        findUnique: jest.fn().mockResolvedValue({ id: 12, role: 'ETUDIANT' }),
      },
      universityPost: {
        findUnique: jest
          .fn()
          .mockResolvedValue(post === null ? null : { post, universityId }),
      },
    }) as never;

  const guard = (requis: string[], post: string | null, universityId = 7) =>
    new UniversityPostGuard(reflector(requis), prisma(post, universityId));

  it('laisse passer le Chef Universitaire sur une route de lecture partagée', async () => {
    await expect(
      guard(
        ['SECRETAIRE', 'CHEF_UNIVERSITAIRE'],
        'CHEF_UNIVERSITAIRE',
      ).canActivate(ctx(CHEF, { id: '7' })),
    ).resolves.toBe(true);
  });

  it('laisse passer la Secrétaire sur cette même route', async () => {
    await expect(
      guard(['SECRETAIRE', 'CHEF_UNIVERSITAIRE'], 'SECRETAIRE').canActivate(
        ctx(CHEF, { id: '7' }),
      ),
    ).resolves.toBe(true);
  });

  it('refuse le Chef Universitaire sur un acte réservé à la Secrétaire', async () => {
    await expect(
      guard(['SECRETAIRE'], 'CHEF_UNIVERSITAIRE').canActivate(
        ctx(CHEF, { id: '7' }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse un Chef Universitaire d'une autre université", async () => {
    await expect(
      guard(
        ['SECRETAIRE', 'CHEF_UNIVERSITAIRE'],
        'CHEF_UNIVERSITAIRE',
        99,
      ).canActivate(ctx(CHEF, { id: '7' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('laisse passer un ADMIN global sans poste universitaire', async () => {
    const p = {
      member: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, role: 'ADMIN' }),
      },
      universityPost: { findUnique: jest.fn().mockResolvedValue(null) },
    } as never;
    await expect(
      new UniversityPostGuard(reflector(['SECRETAIRE']), p).canActivate(
        ctx(ADMIN, { id: '7' }),
      ),
    ).resolves.toBe(true);
  });
});
