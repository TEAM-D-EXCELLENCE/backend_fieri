import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('../../prisma/prisma.service');
jest.mock('./organization.service');

describe('OrganizationController', () => {
  let controller: OrganizationController;

  beforeEach(async () => {
    const mockPrismaService = {
      country: {
        findMany: jest.fn(),
      },
    };

    const mockOrganizationService = {
      getCountries: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        {
          provide: OrganizationService,
          useValue: mockOrganizationService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationController>(OrganizationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
