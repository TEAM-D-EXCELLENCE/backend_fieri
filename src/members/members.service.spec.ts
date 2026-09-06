import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * `GET /members` n'avait aucune garde : elle distribuait l'adresse e-mail de
 * tous les membres a qui la demandait, sans authentification. Elle exige
 * maintenant un compte, et ne joint les coordonnees qu'a qui exerce une
 * responsabilite. Ces tests tiennent cette regle.
 */
describe('MembersService — les coordonnees ne partent pas a tout le monde', () => {
  let service: MembersService;
  let prisma: {
    member: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };

  /** Le membre liste, tel que le renvoie Prisma. */
  const LISTE = [
    {
      id: 2,
      firstname: 'Ama',
      lastname: 'Doe',
      email: 'ama@fieri.org',
      role: 'ETUDIANT',
      branchId: 1,
      isEmblematic: false,
      universityPost: null,
      countryPost: null,
      responsibleOfClubs: [],
      createdAt: new Date('2026-01-01'),
    },
  ];

  /** Le profil du demandeur, tel que le lit `canViewContacts`. */
  const demandeur = (surcharge: Record<string, unknown> = {}) => ({
    role: 'ETUDIANT',
    universityPost: null,
    countryPost: null,
    responsibleOfClubs: [],
    ...surcharge,
  });

  beforeEach(async () => {
    prisma = {
      member: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue(LISTE),
        count: jest.fn().mockResolvedValue(LISTE.length),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [MembersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<MembersService>(MembersService);
  });

  const lister = (viewerId?: number) =>
    service.getMembers({ page: 1, limit: 20, viewerId });

  it('joint l’adresse a un ADMIN', async () => {
    prisma.member.findUnique.mockResolvedValue(demandeur({ role: 'ADMIN' }));
    const res = await lister(1);
    expect(res.data[0]).toHaveProperty('email', 'ama@fieri.org');
  });

  it('joint l’adresse a qui detient un poste d’universite', async () => {
    prisma.member.findUnique.mockResolvedValue(
      demandeur({ universityPost: { id: 9 } }),
    );
    const res = await lister(1);
    expect(res.data[0]).toHaveProperty('email');
  });

  it('joint l’adresse a qui detient un poste de pays', async () => {
    prisma.member.findUnique.mockResolvedValue(
      demandeur({ countryPost: { id: 3 } }),
    );
    const res = await lister(1);
    expect(res.data[0]).toHaveProperty('email');
  });

  it('joint l’adresse a un responsable de club', async () => {
    prisma.member.findUnique.mockResolvedValue(
      demandeur({ responsibleOfClubs: [{ id: 'club-1' }] }),
    );
    const res = await lister(1);
    expect(res.data[0]).toHaveProperty('email');
  });

  it('la retient a un membre ordinaire, sans lui cacher les noms', async () => {
    // Le chef de projet a besoin des NOMS pour affecter une tache. Pas des
    // coordonnees.
    prisma.member.findUnique.mockResolvedValue(
      demandeur({ role: 'CHEF_DE_PROJET' }),
    );
    const res = await lister(1);
    expect(res.data[0]).not.toHaveProperty('email');
    expect(res.data[0]).toMatchObject({ firstName: 'Ama', lastName: 'Doe' });
  });

  it('la retient quand le demandeur n’est pas identifie', async () => {
    const res = await lister(undefined);
    expect(res.data[0]).not.toHaveProperty('email');
    expect(prisma.member.findUnique).not.toHaveBeenCalled();
  });

  it('la retient quand le demandeur n’existe plus', async () => {
    prisma.member.findUnique.mockResolvedValue(null);
    const res = await lister(404);
    expect(res.data[0]).not.toHaveProperty('email');
  });
});
