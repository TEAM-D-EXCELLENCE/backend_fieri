import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const TRANSACTION_TYPES = [
  'COTISATION',
  'DON',
  'SUBVENTION',
  'DEPENSE',
] as const;
type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface RecordTransactionDto {
  type: TransactionType;
  amount: number;
  label: string;
}

@Injectable()
export class TreasuryService {
  constructor(private prisma: PrismaService) {}

  /** Renvoie le solde et l'historique des transactions d'une université. */
  async getTreasury(universityId: number) {
    const university = await this.prisma.university.findUnique({
      where: { id: universityId },
    });
    if (!university) {
      throw new NotFoundException('Université introuvable.');
    }

    // Crée le compte de trésorerie à la volée s'il n'existe pas encore.
    const account = await this.prisma.treasuryAccount.upsert({
      where: { universityId },
      update: {},
      create: { universityId, balance: 0 },
    });

    const transactions = await this.prisma.treasuryTransaction.findMany({
      where: { universityId },
      orderBy: { createdAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, firstname: true, lastname: true } },
      },
    });

    return {
      success: true,
      data: {
        universityId,
        universityName: university.name,
        balance: account.balance,
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          label: t.label,
          recordedBy: t.recordedBy
            ? `${t.recordedBy.firstname} ${t.recordedBy.lastname}`
            : null,
          createdAt: t.createdAt,
        })),
      },
    };
  }

  /**
   * Enregistre une transaction (recette ou dépense) et recalcule
   * atomiquement le solde de l'université.
   */
  async recordTransaction(
    universityId: number,
    dto: RecordTransactionDto,
    recordedById: number,
  ) {
    if (!TRANSACTION_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        `Type de transaction invalide. Valeurs autorisées : ${TRANSACTION_TYPES.join(', ')}.`,
      );
    }
    const rawAmount = Number(dto.amount);
    if (!Number.isFinite(rawAmount) || rawAmount === 0) {
      throw new BadRequestException('Le montant doit être un nombre non nul.');
    }
    if (!dto.label || !dto.label.trim()) {
      throw new BadRequestException('Un libellé est requis.');
    }

    const university = await this.prisma.university.findUnique({
      where: { id: universityId },
    });
    if (!university) {
      throw new NotFoundException('Université introuvable.');
    }

    // Convention : les dépenses sont stockées en négatif, les recettes en positif.
    const signedAmount =
      dto.type === 'DEPENSE' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.treasuryAccount.upsert({
        where: { universityId },
        update: {},
        create: { universityId, balance: 0 },
      });
      const updated = await tx.treasuryAccount.update({
        where: { universityId },
        data: { balance: account.balance + signedAmount },
      });
      const transaction = await tx.treasuryTransaction.create({
        data: {
          universityId,
          type: dto.type,
          amount: signedAmount,
          label: dto.label.trim(),
          recordedById,
        },
      });
      return { balance: updated.balance, transaction };
    });

    return {
      success: true,
      data: { balance: result.balance, transaction: result.transaction },
    };
  }

  /**
   * Incrémente le solde d'une université À L'INTÉRIEUR d'une transaction Prisma
   * existante. Utilisé par le flux de dons (webhook de paiement) pour rester
   * atomique avec la création de la `TreasuryTransaction` et la validation de
   * la `SupportOffer`.
   */
  async incrementBalance(
    tx: Prisma.TransactionClient,
    universityId: number,
    amount: number,
  ) {
    const account = await tx.treasuryAccount.upsert({
      where: { universityId },
      update: {},
      create: { universityId, balance: 0 },
    });
    return tx.treasuryAccount.update({
      where: { universityId },
      data: { balance: account.balance + amount },
    });
  }
}
