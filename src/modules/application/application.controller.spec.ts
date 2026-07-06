import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Reflector } from '@nestjs/core';

describe('ApplicationController', () => {
  let controller: ApplicationController;

  const mockApplicationService = {
    submitApplication: jest.fn(),
    getMyApplications: jest.fn(),
    checkIfApplied: jest.fn(),
    getOpportunityApplications: jest.fn(),
    updateApplicationStatus: jest.fn(),
  };

  const mockPrismaService = {};
  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [
        { provide: ApplicationService, useValue: mockApplicationService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    controller = module.get<ApplicationController>(ApplicationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyApplications', () => {
    it('should call service.getMyApplications', async () => {
      mockApplicationService.getMyApplications.mockResolvedValue({
        success: true,
        data: [],
      });
      const req = { user: { id: 1 } };

      const result = await controller.getMyApplications(req);

      expect(mockApplicationService.getMyApplications).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true, data: [] });
    });
  });

  describe('checkIfApplied', () => {
    it('should call service.checkIfApplied', async () => {
      mockApplicationService.checkIfApplied.mockResolvedValue({
        success: true,
        hasApplied: false,
        application: null,
      });
      const req = { user: { id: 1 } };

      const result = await controller.checkIfApplied('opp-1', req);

      expect(mockApplicationService.checkIfApplied).toHaveBeenCalledWith(
        1,
        'opp-1',
      );
      expect(result).toEqual({
        success: true,
        hasApplied: false,
        application: null,
      });
    });
  });
});
