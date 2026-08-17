import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

describe('SupportController', () => {
  let controller: SupportController;

  let initiateFinancial: jest.Mock;
  let handlePaymentWebhook: jest.Mock;
  let confirmMockPayment: jest.Mock;
  let submitPhysical: jest.Mock;
  let signBiometric: jest.Mock;

  beforeEach(async () => {
    delete process.env.GENIUS_PAY_MOCK;

    initiateFinancial = jest.fn();
    handlePaymentWebhook = jest.fn();
    confirmMockPayment = jest.fn();
    submitPhysical = jest.fn();
    signBiometric = jest.fn();

    const supportService = {
      initiateFinancial,
      handlePaymentWebhook,
      confirmMockPayment,
      submitPhysical,
      signBiometric,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [{ provide: SupportService, useValue: supportService }],
    }).compile();

    controller = module.get<SupportController>(SupportController);
  });

  afterEach(() => {
    delete process.env.GENIUS_PAY_MOCK;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should forward the raw body and signature to the service', async () => {
    const rawBody = Buffer.from('{"type":"checkout.session.completed"}');
    handlePaymentWebhook.mockResolvedValue({
      received: true,
      validated: true,
      supportOfferId: 'offer-1',
    });

    const result = await controller.paymentWebhook(
      { rawBody } as RawBodyRequest<Request>,
      'signature-hmac',
    );

    expect(handlePaymentWebhook).toHaveBeenCalledWith(
      rawBody,
      'signature-hmac',
    );
    expect(result).toEqual({
      received: true,
      validated: true,
      supportOfferId: 'offer-1',
    });
  });

  it('should forward the member id extracted from the request user', async () => {
    initiateFinancial.mockResolvedValue({ success: true });

    await controller.initiateFinancial(
      { universityId: 1, amount: 5000, donorName: 'A', donorEmail: 'a@b.c' },
      { user: { id: 42 } } as Request & { user?: { id: number } },
    );

    expect(initiateFinancial).toHaveBeenCalledWith(
      expect.objectContaining({ universityId: 1 }),
      42,
    );
  });

  it('should forward null member id for anonymous donors', async () => {
    initiateFinancial.mockResolvedValue({ success: true });

    await controller.initiateFinancial(
      { universityId: 1, amount: 5000, donorName: 'A', donorEmail: 'a@b.c' },
      {} as Request & { user?: { id: number } },
    );

    expect(initiateFinancial).toHaveBeenCalledWith(expect.anything(), null);
  });

  describe('confirmMockPayment', () => {
    it('should throw NotFoundException when the mock mode is disabled', async () => {
      await expect(controller.confirmMockPayment('offer-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(confirmMockPayment).not.toHaveBeenCalled();
    });

    it('should delegate to the service when the mock mode is enabled', async () => {
      process.env.GENIUS_PAY_MOCK = 'true';
      confirmMockPayment.mockResolvedValue({
        success: true,
        validated: true,
        supportOfferId: 'offer-1',
        amount: 5000,
        universityId: 1,
      });

      const result = await controller.confirmMockPayment('offer-1');

      expect(confirmMockPayment).toHaveBeenCalledWith('offer-1');
      expect(result).toEqual({
        success: true,
        validated: true,
        supportOfferId: 'offer-1',
        amount: 5000,
        universityId: 1,
      });
    });
  });

  it('should forward the biometric context to the service', async () => {
    signBiometric.mockResolvedValue({ success: true, data: {} });

    await controller.signBiometric('offer-2', {
      headers: { 'user-agent': 'jest-agent' },
      ip: '10.0.0.1',
    } as Request & { user?: { id: number } });

    expect(signBiometric).toHaveBeenCalledWith('offer-2', {
      ip: '10.0.0.1',
      userAgent: 'jest-agent',
      memberId: null,
    });
  });
});
