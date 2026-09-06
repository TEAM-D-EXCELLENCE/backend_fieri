import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Les mocks sont typés : ces tests lisent les arguments passés à Prisma, et
 * `jest.fn()` sans signature les rendrait `any` — vingt et un avertissements
 * que la CI refuse (`--max-warnings 0`).
 */
type ArgsUpsert = {
  where: { email: string };
  create: { email: string; source: string; memberId: number | null };
  update: { unsubscribedAt: null; memberId?: number; source?: string };
};
type ArgsUpdateMany = {
  where: { email: string; unsubscribedAt: null };
  data: { unsubscribedAt: Date };
};
type ArgsFindMany = { where: { unsubscribedAt: null } };

describe('NewsletterService', () => {
  let service: NewsletterService;
  let upsert: jest.Mock<Promise<unknown>, [ArgsUpsert]>;
  let updateMany: jest.Mock<Promise<{ count: number }>, [ArgsUpdateMany]>;
  let findMany: jest.Mock<Promise<unknown[]>, [ArgsFindMany]>;

  beforeEach(async () => {
    upsert = jest
      .fn<Promise<unknown>, [ArgsUpsert]>()
      .mockResolvedValue({ id: 1, email: 'a@b.co', createdAt: new Date() });
    updateMany = jest
      .fn<Promise<{ count: number }>, [ArgsUpdateMany]>()
      .mockResolvedValue({ count: 1 });
    findMany = jest
      .fn<Promise<unknown[]>, [ArgsFindMany]>()
      .mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        {
          provide: PrismaService,
          useValue: { newsletterSubscriber: { upsert, updateMany, findMany } },
        },
      ],
    }).compile();
    service = module.get<NewsletterService>(NewsletterService);
  });

  describe('subscribe', () => {
    it('normalise l’adresse : espaces retirés, minuscules', async () => {
      await service.subscribe({ email: '  Ama@FIERI.ORG ' });
      expect(upsert.mock.calls[0][0].where).toEqual({ email: 'ama@fieri.org' });
    });

    it.each([
      ['vide', ''],
      ['sans arobase', 'ama.fieri.org'],
      ['sans domaine pointé', 'ama@fieri'],
      ['avec une espace', 'a ma@fieri.org'],
      ['absente', undefined],
    ])('refuse une adresse %s', async (_cas, email) => {
      await expect(service.subscribe({ email })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(upsert).not.toHaveBeenCalled();
    });

    it('est idempotent : un second abonnement réactive au lieu d’échouer', async () => {
      await service.subscribe({ email: 'a@b.co' });
      expect(upsert.mock.calls[0][0].update).toMatchObject({
        unsubscribedAt: null,
      });
    });

    it('rattache l’abonnement au compte quand il y en a un', async () => {
      await service.subscribe({ email: 'a@b.co', source: 'inscription' }, 42);
      expect(upsert.mock.calls[0][0].create).toMatchObject({
        memberId: 42,
        source: 'inscription',
      });
    });

    it('accepte l’abonnement sans compte', async () => {
      await service.subscribe({ email: 'a@b.co' });
      expect(upsert.mock.calls[0][0].create.memberId).toBeNull();
    });

    it('ramène une provenance inconnue sur « footer »', async () => {
      await service.subscribe({ email: 'a@b.co', source: 'ailleurs' });
      expect(upsert.mock.calls[0][0].create.source).toBe('footer');
    });

    it('ne réécrit pas la provenance d’origine sur un réabonnement', async () => {
      await service.subscribe({ email: 'a@b.co', source: 'banniere' });
      expect(upsert.mock.calls[0][0].update.source).toBeUndefined();
    });
  });

  describe('unsubscribe', () => {
    it('date la ligne au lieu de la supprimer', async () => {
      await service.unsubscribe({ email: 'a@b.co' });
      expect(updateMany.mock.calls[0][0].data.unsubscribedAt).toBeInstanceOf(
        Date,
      );
    });

    it('réussit sur une adresse inconnue, sans le révéler', async () => {
      updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.unsubscribe({ email: 'inconnue@b.co' }),
      ).resolves.toMatchObject({ success: true });
    });
  });

  describe('list', () => {
    it('ne rend que les abonnés actifs', async () => {
      await service.list();
      expect(findMany.mock.calls[0][0].where).toEqual({
        unsubscribedAt: null,
      });
    });
  });
});
