import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TreasuryService } from './treasury.service';

interface MockTx {
  treasuryAccount: { upsert: jest.Mock; update: jest.Mock };
  treasuryTransaction: { create: jest.Mock };
}

describe('TreasuryService', () => {
  let service: TreasuryService;

  let findUniqueUniversity: jest.Mock;
  let upsertAccount: jest.Mock;
  let findManyTransactions: jest.Mock;
  let $transaction: jest.Mock;
  let txUpsertAccount: jest.Mock;
  let txUpdateAccount: jest.Mock;
  let txCreateTransaction: jest.Mock;
  let mockTx: MockTx;

  beforeEach(async () => {
    findUniqueUniversity = jest.fn();
    upsertAccount = jest.fn();
    findManyTransactions = jest.fn();
    txUpsertAccount = jest.fn();
    txUpdateAccount = jest.fn();
    txCreateTransaction = jest.fn();

    mockTx = {
      treasuryAccount: {
        upsert: txUpsertAccount,
        update: txUpdateAccount,
      },
      treasuryTransaction: { create: txCreateTransaction },
    };
    $transaction = jest.fn();
    $transaction.mockImplementation((cb: (tx: MockTx) => unknown) =>
      cb(mockTx),
    );

    const prisma = {
      university: { findUnique: findUniqueUniversity },
      treasuryAccount: { upsert: upsertAccount },
      treasuryTransaction: {
        findMany: findManyTransactions,
        create: jest.fn(),
      },
      $transaction,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreasuryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TreasuryService>(TreasuryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTreasury', () => {
    it('should throw NotFoundException for an unknown university', async () => {
      findUniqueUniversity.mockResolvedValue(null);

      await expect(service.getTreasury(99)).rejects.toThrow(NotFoundException);
      expect(upsertAccount).not.toHaveBeenCalled();
    });

    it('should create the account on the fly and return balance + transactions', async () => {
      findUniqueUniversity.mockResolvedValue({ id: 1, name: 'UCAD' });
      upsertAccount.mockResolvedValue({ universityId: 1, balance: 2500 });
      findManyTransactions.mockResolvedValue([
        {
          id: 'tx-1',
          type: 'DON',
          amount: 2500,
          label: 'Don en ligne',
          recordedBy: { id: 3, firstname: 'Awa', lastname: 'Diallo' },
          createdAt: new Date('2026-01-01T10:00:00Z'),
        },
        {
          id: 'tx-2',
          type: 'DEPENSE',
          amount: -500,
          label: 'Achat fournitures',
          recordedBy: null,
          createdAt: new Date('2026-01-02T10:00:00Z'),
        },
      ]);

      const result = await service.getTreasury(1);

      expect(upsertAccount).toHaveBeenCalledWith({
        where: { universityId: 1 },
        update: {},
        create: { universityId: 1, balance: 0 },
      });
      expect(findManyTransactions).toHaveBeenCalledWith({
        where: { universityId: 1 },
        orderBy: { createdAt: 'desc' },
        include: {
          recordedBy: { select: { id: true, firstname: true, lastname: true } },
        },
      });
      expect(result).toEqual({
        success: true,
        data: {
          universityId: 1,
          universityName: 'UCAD',
          balance: 2500,
          transactions: [
            {
              id: 'tx-1',
              type: 'DON',
              amount: 2500,
              label: 'Don en ligne',
              recordedBy: 'Awa Diallo',
              createdAt: new Date('2026-01-01T10:00:00Z'),
            },
            {
              id: 'tx-2',
              type: 'DEPENSE',
              amount: -500,
              label: 'Achat fournitures',
              recordedBy: null,
              createdAt: new Date('2026-01-02T10:00:00Z'),
            },
          ],
        },
      });
    });
  });

  describe('recordTransaction', () => {
    it('should reject an invalid transaction type', async () => {
      await expect(
        service.recordTransaction(
          1,
          { type: 'Virement' as never, amount: 100, label: 'x' },
          3,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(findUniqueUniversity).not.toHaveBeenCalled();
    });

    it('should reject a zero amount', async () => {
      await expect(
        service.recordTransaction(1, { type: 'DON', amount: 0, label: 'x' }, 3),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a non-finite amount', async () => {
      await expect(
        service.recordTransaction(
          1,
          { type: 'DON', amount: Number.NaN, label: 'x' },
          3,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require a non-empty label', async () => {
      await expect(
        service.recordTransaction(
          1,
          { type: 'DON', amount: 100, label: '   ' },
          3,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for an unknown university', async () => {
      findUniqueUniversity.mockResolvedValue(null);

      await expect(
        service.recordTransaction(
          99,
          { type: 'DON', amount: 100, label: 'x' },
          3,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should store expenses negative and income positive, recalculating the balance', async () => {
      findUniqueUniversity.mockResolvedValue({ id: 1, name: 'UCAD' });
      txUpsertAccount.mockResolvedValue({ universityId: 1, balance: 1000 });
      txUpdateAccount.mockResolvedValue({ universityId: 1, balance: 500 });
      txCreateTransaction.mockResolvedValue({
        id: 'tx-3',
        type: 'DEPENSE',
        amount: -500,
        label: 'Achat',
      });

      const result = await service.recordTransaction(
        1,
        { type: 'DEPENSE', amount: -500, label: '  Achat  ' },
        3,
      );

      expect(txUpsertAccount).toHaveBeenCalledWith({
        where: { universityId: 1 },
        update: {},
        create: { universityId: 1, balance: 0 },
      });
      expect(txUpdateAccount).toHaveBeenCalledWith({
        where: { universityId: 1 },
        data: { balance: 500 },
      });
      expect(txCreateTransaction).toHaveBeenCalledWith({
        data: {
          universityId: 1,
          type: 'DEPENSE',
          amount: -500,
          label: 'Achat',
          recordedById: 3,
        },
      });
      expect(result).toEqual({
        success: true,
        data: {
          balance: 500,
          transaction: {
            id: 'tx-3',
            type: 'DEPENSE',
            amount: -500,
            label: 'Achat',
          },
        },
      });
    });

    it('should keep positive income positive regardless of sign', async () => {
      findUniqueUniversity.mockResolvedValue({ id: 1, name: 'UCAD' });
      txUpsertAccount.mockResolvedValue({ universityId: 1, balance: 0 });
      txUpdateAccount.mockResolvedValue({ universityId: 1, balance: 250 });
      txCreateTransaction.mockResolvedValue({ id: 'tx-4' });

      await service.recordTransaction(
        1,
        { type: 'COTISATION', amount: -250, label: 'Cotisation' },
        3,
      );

      expect(txUpdateAccount).toHaveBeenCalledWith({
        where: { universityId: 1 },
        data: { balance: 250 },
      });
      expect(txCreateTransaction).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 250,
          type: 'COTISATION',
        }) as Record<string, unknown>,
      });
    });
  });

  describe('incrementBalance', () => {
    it('should upsert the account and increment its balance', async () => {
      txUpsertAccount.mockResolvedValue({ universityId: 1, balance: 1000 });
      txUpdateAccount.mockResolvedValue({ universityId: 1, balance: 6000 });

      const result = await service.incrementBalance(
        mockTx as unknown as Prisma.TransactionClient,
        1,
        5000,
      );

      expect(txUpsertAccount).toHaveBeenCalledWith({
        where: { universityId: 1 },
        update: {},
        create: { universityId: 1, balance: 0 },
      });
      expect(txUpdateAccount).toHaveBeenCalledWith({
        where: { universityId: 1 },
        data: { balance: 6000 },
      });
      expect(result).toEqual({ universityId: 1, balance: 6000 });
    });
  });
});
