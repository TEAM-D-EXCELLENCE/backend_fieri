import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TreasuryService } from '../treasury/treasury.service';
import { GeniusPayService } from './genius-pay.service';
import { StorageService } from '../../common/storage/storage.service';
import { MailService } from '../../common/mail/mail.service';
import { PdfService } from '../../common/pdf/pdf.service';
import { SupportService } from './support.service';

describe('GeniusPayService (signature HMAC)', () => {
  const secret = 'webhook-secret-de-test';
  let geniusPay: GeniusPayService;

  const sign = (payload: string): string =>
    crypto.createHmac('sha256', secret).update(payload).digest('hex');

  beforeEach(() => {
    delete process.env.GENIUS_PAY_MOCK;
    process.env.GENIUS_PAY_WEBHOOK_SECRET = secret;
    geniusPay = new GeniusPayService();
  });

  afterEach(() => {
    delete process.env.GENIUS_PAY_MOCK;
    delete process.env.GENIUS_PAY_WEBHOOK_SECRET;
  });

  it('should accept a valid HMAC signature', () => {
    const body = JSON.stringify({ type: 'checkout.session.completed' });
    expect(geniusPay.verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it('should reject an invalid signature', () => {
    expect(
      geniusPay.verifyWebhookSignature('corps-de-test', 'f'.repeat(64)),
    ).toBe(false);
  });

  it('should reject a request without signature header', () => {
    expect(geniusPay.verifyWebhookSignature('corps-de-test')).toBe(false);
  });

  it('should reject when the webhook secret is missing', () => {
    delete process.env.GENIUS_PAY_WEBHOOK_SECRET;
    const noSecret = new GeniusPayService();
    expect(noSecret.verifyWebhookSignature('corps', 'sig')).toBe(false);
  });

  it('should accept any signature in GENIUS_PAY_MOCK=true mode', () => {
    process.env.GENIUS_PAY_MOCK = 'true';
    const mockMode = new GeniusPayService();
    expect(
      mockMode.verifyWebhookSignature('nimporte-quoi', 'totalement-invalide'),
    ).toBe(true);
  });

  it('should reject a signature of different length', () => {
    const body = 'corps';
    const truncated = sign(body).slice(0, 20);
    expect(geniusPay.verifyWebhookSignature(body, truncated)).toBe(false);
  });

  it('should not throw on non-hex signature (timing-safe comparison guard)', () => {
    expect(geniusPay.verifyWebhookSignature('corps', '!!not-hex!!')).toBe(
      false,
    );
  });

  it('should accept a "sha256=" prefixed signature header', () => {
    const body = 'corps';
    expect(geniusPay.verifyWebhookSignature(body, `sha256=${sign(body)}`)).toBe(
      true,
    );
  });

  it('should accept a Buffer raw body', () => {
    const body = Buffer.from('corps-binaire');
    expect(geniusPay.verifyWebhookSignature(body, sign('corps-binaire'))).toBe(
      true,
    );
  });
});

interface MockTx {
  treasuryTransaction: { create: jest.Mock };
  supportOffer: { update: jest.Mock };
}

describe('SupportService', () => {
  let service: SupportService;

  let findUniqueUniversity: jest.Mock;
  let createOffer: jest.Mock;
  let updateSupportOffer: jest.Mock;
  let findUniqueOffer: jest.Mock;
  let findFirstOffer: jest.Mock;
  let $transaction: jest.Mock;
  let txCreateTreasuryTransaction: jest.Mock;
  let txUpdateOffer: jest.Mock;
  let verifySignature: jest.Mock;
  let createCheckoutSession: jest.Mock;
  let incrementBalance: jest.Mock;
  let saveFile: jest.Mock;
  let sendMail: jest.Mock;
  let generateAgreement: jest.Mock;
  let mockTx: MockTx;

  const offer = {
    id: 'offer-1',
    donorName: 'Jean Dupont',
    donorEmail: 'jean.dupont@mail.com',
    type: 'FINANCIAL',
    amount: 5000,
    status: 'PENDING',
    universityId: 1,
  };

  const completedWebhook = (overrides: Record<string, unknown> = {}) =>
    Buffer.from(
      JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            reference: 'REF-123',
            metadata: { supportOfferId: 'offer-1' },
            ...overrides,
          },
        },
      }),
    );

  beforeEach(async () => {
    delete process.env.GENIUS_PAY_MOCK;
    delete process.env.FRONTEND_URL;

    findUniqueUniversity = jest.fn();
    createOffer = jest.fn();
    updateSupportOffer = jest.fn();
    findUniqueOffer = jest.fn();
    findFirstOffer = jest.fn();
    txCreateTreasuryTransaction = jest.fn();
    txUpdateOffer = jest.fn();
    verifySignature = jest.fn();
    createCheckoutSession = jest.fn();
    incrementBalance = jest.fn();
    saveFile = jest.fn();
    sendMail = jest.fn();
    generateAgreement = jest.fn();

    mockTx = {
      treasuryTransaction: { create: txCreateTreasuryTransaction },
      supportOffer: { update: txUpdateOffer },
    };
    $transaction = jest.fn();
    $transaction.mockImplementation((cb: (tx: MockTx) => unknown) =>
      cb(mockTx),
    );

    const prisma = {
      university: { findUnique: findUniqueUniversity },
      supportOffer: {
        create: createOffer,
        update: updateSupportOffer,
        findUnique: findUniqueOffer,
        findFirst: findFirstOffer,
      },
      $transaction,
    };
    const treasury = { incrementBalance };
    const geniusPay = {
      createCheckoutSession,
      verifyWebhookSignature: verifySignature,
    };
    const storage = { save: saveFile };
    const mail = { sendMail };
    const pdf = { generateSupportAgreement: generateAgreement };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prisma },
        { provide: TreasuryService, useValue: treasury },
        { provide: GeniusPayService, useValue: geniusPay },
        { provide: StorageService, useValue: storage },
        { provide: MailService, useValue: mail },
        { provide: PdfService, useValue: pdf },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  afterEach(() => {
    delete process.env.GENIUS_PAY_MOCK;
    delete process.env.FRONTEND_URL;
    jest.clearAllMocks();
  });

  describe('handlePaymentWebhook', () => {
    it('should reject a webhook without raw body', async () => {
      await expect(
        service.handlePaymentWebhook(undefined, 'sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a webhook with an invalid signature and not credit anything', async () => {
      verifySignature.mockReturnValue(false);

      await expect(
        service.handlePaymentWebhook(completedWebhook(), 'invalide'),
      ).rejects.toThrow(UnauthorizedException);
      expect(findFirstOffer).not.toHaveBeenCalled();
      expect(incrementBalance).not.toHaveBeenCalled();
    });

    it('should reject an invalid JSON payload', async () => {
      verifySignature.mockReturnValue(true);

      await expect(
        service.handlePaymentWebhook(Buffer.from('{pas du json'), 'sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ignore non-final event types without touching the treasury', async () => {
      verifySignature.mockReturnValue(true);
      const body = Buffer.from(
        JSON.stringify({ type: 'checkout.session.expired' }),
      );

      const result = await service.handlePaymentWebhook(body, 'sig');

      expect(result).toEqual({ received: true, ignored: true });
      expect(findFirstOffer).not.toHaveBeenCalled();
      expect(incrementBalance).not.toHaveBeenCalled();
    });

    it('should reject a webhook without any exploitable reference', async () => {
      verifySignature.mockReturnValue(true);
      const body = Buffer.from(JSON.stringify({ type: 'payment.succeeded' }));

      await expect(service.handlePaymentWebhook(body, 'sig')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject when the support offer is not found', async () => {
      verifySignature.mockReturnValue(true);
      findFirstOffer.mockResolvedValue(null);

      await expect(
        service.handlePaymentWebhook(completedWebhook(), 'sig'),
      ).rejects.toThrow(NotFoundException);
      expect(incrementBalance).not.toHaveBeenCalled();
    });

    it('should credit the treasury, record a DON and validate the offer', async () => {
      verifySignature.mockReturnValue(true);
      findFirstOffer.mockResolvedValue(offer);
      txCreateTreasuryTransaction.mockResolvedValue({ id: 'tx-1' });
      txUpdateOffer.mockResolvedValue({});
      incrementBalance.mockResolvedValue({ balance: 5000 });

      const result = await service.handlePaymentWebhook(
        completedWebhook(),
        'sig',
      );

      expect(result).toEqual({
        received: true,
        validated: true,
        supportOfferId: 'offer-1',
      });
      expect(findFirstOffer).toHaveBeenCalledWith({
        where: {
          OR: [{ paymentReference: 'REF-123' }, { id: 'offer-1' }],
        },
      });
      expect(incrementBalance).toHaveBeenCalledWith(mockTx, 1, 5000);
      expect(txCreateTreasuryTransaction).toHaveBeenCalledWith({
        data: expect.objectContaining({
          universityId: 1,
          type: 'DON',
          amount: 5000,
        }) as Record<string, unknown>,
      });
      expect(txUpdateOffer).toHaveBeenCalledWith({
        where: { id: 'offer-1' },
        data: { status: 'VALIDATED' },
      });
    });

    it('should be idempotent: a replayed webhook does not double-credit', async () => {
      verifySignature.mockReturnValue(true);
      findFirstOffer.mockResolvedValue({ ...offer, status: 'VALIDATED' });

      const result = await service.handlePaymentWebhook(
        completedWebhook(),
        'sig',
      );

      expect(result).toEqual({
        received: true,
        alreadyProcessed: true,
        supportOfferId: 'offer-1',
      });
      expect(incrementBalance).not.toHaveBeenCalled();
      expect(txCreateTreasuryTransaction).not.toHaveBeenCalled();
    });

    it('should reject an offer missing universityId or amount', async () => {
      verifySignature.mockReturnValue(true);
      findFirstOffer.mockResolvedValue({ ...offer, universityId: null });

      await expect(
        service.handlePaymentWebhook(completedWebhook(), 'sig'),
      ).rejects.toThrow(BadRequestException);
      expect(incrementBalance).not.toHaveBeenCalled();
    });
  });

  describe('confirmMockPayment', () => {
    it('should throw NotFoundException when the offer does not exist', async () => {
      findUniqueOffer.mockResolvedValue(null);

      await expect(service.confirmMockPayment('offre-absente')).rejects.toThrow(
        NotFoundException,
      );
      expect(incrementBalance).not.toHaveBeenCalled();
    });

    it('should confirm and credit an already-pending offer', async () => {
      findUniqueOffer.mockResolvedValue(offer);
      txCreateTreasuryTransaction.mockResolvedValue({ id: 'tx-1' });
      incrementBalance.mockResolvedValue({ balance: 5000 });

      const result = await service.confirmMockPayment('offer-1');

      expect(result).toEqual({
        success: true,
        validated: true,
        supportOfferId: 'offer-1',
        amount: 5000,
        universityId: 1,
      });
      expect(incrementBalance).toHaveBeenCalledWith(mockTx, 1, 5000);
      expect(txCreateTreasuryTransaction).toHaveBeenCalledWith({
        data: expect.objectContaining({
          universityId: 1,
          type: 'DON',
          amount: 5000,
        }) as Record<string, unknown>,
      });
      expect(txUpdateOffer).toHaveBeenCalledWith({
        where: { id: 'offer-1' },
        data: { status: 'VALIDATED' },
      });
    });

    it('should not double-credit an already validated offer', async () => {
      findUniqueOffer.mockResolvedValue({ ...offer, status: 'VALIDATED' });

      const result = await service.confirmMockPayment('offer-1');

      expect(result).toEqual({
        success: true,
        alreadyValidated: true,
        supportOfferId: 'offer-1',
        amount: 5000,
        universityId: 1,
      });
      expect(incrementBalance).not.toHaveBeenCalled();
      expect(txCreateTreasuryTransaction).not.toHaveBeenCalled();
    });

    it('should reject an incomplete offer', async () => {
      findUniqueOffer.mockResolvedValue({ ...offer, amount: null });

      await expect(service.confirmMockPayment('offer-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(incrementBalance).not.toHaveBeenCalled();
    });
  });

  describe('initiateFinancial', () => {
    it('should reject an invalid universityId', async () => {
      await expect(
        service.initiateFinancial(
          {
            universityId: Number.NaN,
            amount: 1000,
            donorName: 'A',
            donorEmail: 'a@b.c',
          },
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a non-positive amount', async () => {
      await expect(
        service.initiateFinancial(
          { universityId: 1, amount: -5, donorName: 'A', donorEmail: 'a@b.c' },
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require donor name and email', async () => {
      await expect(
        service.initiateFinancial(
          {
            universityId: 1,
            amount: 1000,
            donorName: '  ',
            donorEmail: 'a@b.c',
          },
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when the university does not exist', async () => {
      findUniqueUniversity.mockResolvedValue(null);

      await expect(
        service.initiateFinancial(
          {
            universityId: 1,
            amount: 1000,
            donorName: 'A',
            donorEmail: 'a@b.c',
          },
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create the offer, the checkout session and return the URL', async () => {
      findUniqueUniversity.mockResolvedValue({ id: 1, name: 'UCAD' });
      createOffer.mockResolvedValue({
        id: 'offer-1',
        donorName: 'Jean Dupont',
        donorEmail: 'jean.dupont@mail.com',
        status: 'PENDING',
      });
      createCheckoutSession.mockResolvedValue({
        checkoutUrl: 'https://pay.example/checkout/REF-123',
        reference: 'REF-123',
      });
      updateSupportOffer.mockResolvedValue({});

      const result = await service.initiateFinancial(
        {
          universityId: '1' as unknown as number,
          amount: '5000' as unknown as number,
          donorName: ' Jean Dupont ',
          donorEmail: 'jean.dupont@mail.com',
        },
        null,
      );

      expect(createOffer).toHaveBeenCalledWith({
        data: expect.objectContaining({
          donorName: 'Jean Dupont',
          type: 'FINANCIAL',
          financialPlatform: 'GENIUS_PAY',
          amount: 5000,
          status: 'PENDING',
          universityId: 1,
          memberId: null,
        }) as Record<string, unknown>,
      });
      expect(createCheckoutSession).toHaveBeenCalledWith({
        amount: 5000,
        donorName: 'Jean Dupont',
        donorEmail: 'jean.dupont@mail.com',
        metadata: { supportOfferId: 'offer-1', universityId: '1' },
        successUrl: 'http://localhost:5173/soutien/merci?offer=offer-1',
        cancelUrl: 'http://localhost:5173/soutien/annule?offer=offer-1',
      });
      expect(updateSupportOffer).toHaveBeenCalledWith({
        where: { id: 'offer-1' },
        data: { paymentReference: 'REF-123' },
      });
      expect(result).toEqual({
        success: true,
        data: {
          checkoutUrl: 'https://pay.example/checkout/REF-123',
          supportOfferId: 'offer-1',
          reference: 'REF-123',
        },
      });
    });
  });

  describe('submitPhysical', () => {
    it('should require donor name and email', async () => {
      await expect(
        service.submitPhysical(
          {
            donorName: '',
            donorEmail: '',
            physicalType: 'MATERIEL',
            description: 'x',
          },
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an invalid physical type', async () => {
      await expect(
        service.submitPhysical(
          {
            donorName: 'A',
            donorEmail: 'a@b.c',
            physicalType: 'VEHICULE',
            description: 'x',
          },
          null,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a PHYSICAL offer in PENDING status', async () => {
      createOffer.mockResolvedValue({ id: 'offer-2', status: 'PENDING' });

      const result = await service.submitPhysical(
        {
          donorName: 'A',
          donorEmail: 'a@b.c',
          physicalType: 'materiel',
          description: 'Des ordinateurs',
        },
        null,
      );

      expect(createOffer).toHaveBeenCalledWith({
        data: expect.objectContaining({
          donorName: 'A',
          type: 'PHYSICAL',
          physicalType: 'MATERIEL',
          status: 'PENDING',
          universityId: null,
        }) as Record<string, unknown>,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('signBiometric', () => {
    it('should throw NotFoundException when the offer does not exist', async () => {
      findUniqueOffer.mockResolvedValue(null);

      await expect(
        service.signBiometric('offer-1', {
          ip: '1.2.3.4',
          userAgent: 'test',
          memberId: null,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should refuse to sign a non-physical offer', async () => {
      findUniqueOffer.mockResolvedValue({ ...offer, type: 'FINANCIAL' });

      await expect(
        service.signBiometric('offer-1', {
          ip: '1.2.3.4',
          userAgent: 'test',
          memberId: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should refuse to re-sign an already signed offer', async () => {
      findUniqueOffer.mockResolvedValue({
        ...offer,
        type: 'PHYSICAL',
        fingerprintHash: 'abc123',
      });

      await expect(
        service.signBiometric('offer-1', {
          ip: '1.2.3.4',
          userAgent: 'test',
          memberId: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should hash consent, store the PDF and email the partner', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4');
      findUniqueOffer.mockResolvedValue({
        id: 'offer-2',
        donorName: 'Alice',
        donorEmail: 'alice@mail.com',
        type: 'PHYSICAL',
        physicalType: 'MATERIEL',
        description: 'Des ordinateurs',
        fingerprintHash: null,
        university: { name: 'UCAD' },
      });
      generateAgreement.mockResolvedValue(pdfBuffer);
      saveFile.mockResolvedValue({
        url: '/uploads/support-agreements/entente-offer-2.pdf',
      });
      sendMail.mockResolvedValue(true);
      updateSupportOffer.mockResolvedValue({
        id: 'offer-2',
        signatureDocUrl: '/uploads/support-agreements/entente-offer-2.pdf',
      });

      const result = await service.signBiometric('offer-2', {
        ip: '1.2.3.4',
        userAgent: 'jest',
        memberId: null,
      });

      expect(generateAgreement).toHaveBeenCalledWith(
        expect.objectContaining({
          donorName: 'Alice',
          universityName: 'UCAD',
        }),
      );
      expect(saveFile).toHaveBeenCalledWith(pdfBuffer, {
        subdir: 'support-agreements',
        filename: 'entente-offer-2.pdf',
      });
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'alice@mail.com' }),
      );
      expect(result.success).toBe(true);
      expect(result.data.fingerprintHash).toMatch(/^[0-9a-f]{64}$/);
      expect(result.data.emailed).toBe(true);
    });
  });
});
