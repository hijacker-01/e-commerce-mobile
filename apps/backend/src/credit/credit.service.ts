import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SetCreditTermsDto, LedgerEntryDto } from './dto/credit.dto';

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customer applies for credit (creates a REQUESTED account). */
  async apply(userId: string) {
    const existing = await this.prisma.creditAccount.findUnique({
      where: { userId },
    });
    if (existing) return existing;
    return this.prisma.creditAccount.create({
      data: { userId, status: CreditStatus.REQUESTED },
    });
  }

  getMine(userId: string) {
    return this.prisma.creditAccount.findUnique({
      where: { userId },
      include: { ledger: { orderBy: { createdAt: 'desc' } } },
    });
  }

  /** Owner view of a specific customer's credit account. */
  getForUser(userId: string) {
    return this.getMine(userId);
  }

  /** Owner sets terms and activates the account (the "owner-set credit model"). */
  async setTerms(userId: string, dto: SetCreditTermsDto) {
    return this.prisma.creditAccount.upsert({
      where: { userId },
      create: {
        userId,
        status: CreditStatus.ACTIVE,
        limit: new Prisma.Decimal(dto.limit),
        tenureDays: dto.tenureDays ?? 30,
        interestPct: new Prisma.Decimal(dto.interestPct ?? 0),
      },
      update: {
        status: CreditStatus.ACTIVE,
        limit: new Prisma.Decimal(dto.limit),
        tenureDays: dto.tenureDays ?? 30,
        interestPct: new Prisma.Decimal(dto.interestPct ?? 0),
      },
    });
  }

  /** Record a debit/credit and keep the running balance in sync. */
  async addLedgerEntry(userId: string, dto: LedgerEntryDto) {
    const account = await this.prisma.creditAccount.findUnique({
      where: { userId },
    });
    if (!account) throw new NotFoundException('No credit account');
    if (account.status !== CreditStatus.ACTIVE) {
      throw new BadRequestException('Credit account not active');
    }

    const amount = new Prisma.Decimal(dto.amount);
    const newBalance = account.balance.add(amount);
    if (newBalance.gt(account.limit)) {
      throw new BadRequestException('Credit limit exceeded');
    }
    if (newBalance.lt(0)) {
      throw new BadRequestException('Repayment exceeds outstanding balance');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.creditLedger.create({
        data: {
          accountId: account.id,
          amount,
          reason: dto.reason,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      });
      return tx.creditAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });
    });
  }
}
