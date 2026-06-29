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

  // Deterministic buyback model: the AI gives a good-condition resale
  // reference, then we apply a shop margin, age depreciation and condition
  // deductions — so the offer is realistic and well below resale.
  private buybackFactor(answers: Record<string, string>): number {
    const SHOP_MARGIN = 0.7; // shop never pays full resale, even for a mint unit
    const maps: Record<string, Record<string, number>> = {
      age: { lt6: 0.92, '6to12': 0.8, '1to2': 0.62, gt2: 0.42 },
      power: { works: 1, issues: 0.6, dead: 0.3 },
      screen: { flawless: 1, scratches: 0.88, cracked: 0.55 },
      body: { mint: 1, used: 0.92, damaged: 0.8 },
      battery: { high: 1, mid: 0.92, low: 0.8 },
      faults: { none: 1, camera: 0.85, audio: 0.85, charging: 0.8, biometrics: 0.88 },
      accessories: { all: 1, bill: 0.96, none: 0.9 },
    };
    let factor = SHOP_MARGIN;
    for (const key of Object.keys(maps)) {
      const ans = answers[key];
      factor *= ans && maps[key][ans] != null ? maps[key][ans] : maps[key].none ?? 0.85;
    }
    return factor;
  }

  /** Customer submits an old device; we compute a metrics-based buyback value. */
  async submit(customerId: string, dto: SubmitExchangeDto) {
    const answers = dto.answers ?? {};
    // Ask the AI for a clean good-condition resale reference for the device,
    // then derive the actual buyback ourselves from the condition metrics.
    const estimate = await this.ai.estimateExchangeValue(
      dto.brand,
      dto.model,
      'good condition, fully working, no damage (resale reference)',
    );

    let buyback: number | null = null;
    let details = dto.details;
    if (estimate?.aiValueInr != null) {
      const reference = estimate.aiValueInr;
      const factor = this.buybackFactor(answers);
      // Round to a tidy ₹100.
      buyback = Math.max(0, Math.round((reference * factor) / 100) * 100);
      details =
        (dto.details ? `${dto.details}. ` : '') +
        `Reference ₹${Math.round(reference)} → buyback ₹${buyback} ` +
        `(${Math.round(factor * 100)}% after shop margin, age & condition).`;
    }

    return this.prisma.exchangeRequest.create({
      data: {
        customerId,
        brand: dto.brand,
        model: dto.model,
        condition: dto.condition,
        imei: dto.imei,
        details,
        photos: dto.photos ?? [],
        aiValue: buyback != null ? new Prisma.Decimal(buyback) : undefined,
        status:
          buyback != null ? ExchangeStatus.AI_VALUED : ExchangeStatus.SUBMITTED,
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
