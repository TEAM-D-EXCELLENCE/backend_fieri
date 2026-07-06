import { Test, TestingModule } from '@nestjs/testing';
import { MembersService } from './members.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MembersService', () => {
  let service: MembersService;

  const mockPrisma = {
    member: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        email: 'a@b.c',
        firstname: 'A',
        lastname: 'B',
        role: 'CHERCHEUR',
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
