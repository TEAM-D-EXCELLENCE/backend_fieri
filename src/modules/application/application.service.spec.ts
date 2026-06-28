import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationService } from './application.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ApplicationService', () => {
  let service: ApplicationService;

  const mockPrisma = {
    application: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkIfApplied', () => {
    it('should return hasApplied: true if application exists', async () => {
      const appData = { id: 'app-1', status: 'PENDING' };
      mockPrisma.application.findUnique.mockResolvedValue(appData);

      const result = await service.checkIfApplied(1, 'opp-1');

      expect(mockPrisma.application.findUnique).toHaveBeenCalledWith({
        where: {
          opportunityId_memberId: {
            opportunityId: 'opp-1',
            memberId: 1,
          },
        },
      });
      expect(result).toEqual({
        success: true,
        hasApplied: true,
        application: {
          id: 'app-1',
          status: 'PENDING',
        },
      });
    });

    it('should return hasApplied: false if application does not exist', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(null);

      const result = await service.checkIfApplied(1, 'opp-1');

      expect(result).toEqual({
        success: true,
        hasApplied: false,
        application: null,
      });
    });
  });

  describe('submitApplication', () => {
    it('should throw ConflictException if already applied', async () => {
      mockPrisma.application.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.submitApplication(1, {
          opportunityId: 'opp-1',
          coverLetter: 'Hello',
          cvUrl: 'http://cv',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create new application if not already applied', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(null);
      mockPrisma.application.create.mockResolvedValue({ id: 'new-app', status: 'PENDING' });

      const result = await service.submitApplication(1, {
        opportunityId: 'opp-1',
        coverLetter: 'Hello',
        cvUrl: 'http://cv',
      });

      expect(mockPrisma.application.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('new-app');
    });
  });
});
