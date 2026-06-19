import { Injectable, NotFoundException } from '@nestjs/common';
import { ExchangeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SubmitExchangeDto, ReviewExchangeDto } from './dto/exchange.dto';

@Injectable()
export class ExchangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  /** Customer submits an old device; AI estimates a buyback value. */
  async submit(customerId: string, dto: SubmitExchangeDto) {
    const estimate = await this.ai.estimateExchangeValue(
      dto.brand,
      dto.model,
      dto.condition,
    );
    return this.prisma.exchangeRequest.create({
      data: {
        customerId,
        brand: dto.brand,
        model: dto.model,
        condition: dto.condition,
        photos: dto.photos ?? [],
        aiValue:
          estimate?.aiValueInr != null
            ? new Prisma.Decimal(estimate.aiValueInr)
            : undefined,
        status: estimate?.aiValueInr != null
          ? ExchangeStatus.AI_VALUED
          : ExchangeStatus.SUBMITTED,
      },
    });
  }

  listMine(customerId: string) {
    return this.prisma.exchangeRequest.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.exchangeRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Owner approves (with a final value) or rejects the exchange. */
  async review(id: string, dto: ReviewExchangeDto) {
    const req = await this.prisma.exchangeRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Exchange request not found');

    const reject = dto.decision === 'reject';
    return this.prisma.exchangeRequest.update({
      where: { id },
      data: {
        status: reject ? ExchangeStatus.REJECTED : ExchangeStatus.APPROVED,
        approvedValue:
          !reject && dto.approvedValue != null
            ? new Prisma.Decimal(dto.approvedValue)
            : undefined,
      },
    });
  }
}
