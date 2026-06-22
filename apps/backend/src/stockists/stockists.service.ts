import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChallanStatus, ChallanType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockistDto, CreateChallanDto } from './dto/stockist.dto';

interface ChallanItem {
  productId?: string;
  name: string;
  quantity: number;
  rate: number;
}

@Injectable()
export class StockistsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateStockistDto) {
    return this.prisma.stockist.create({ data: dto });
  }

  list() {
    return this.prisma.stockist.findMany({ orderBy: { name: 'asc' } });
  }

  /** Owner/employee issues an inbound supply challan from a stockist. */
  async createChallan(dto: CreateChallanDto) {
    const stockist = await this.prisma.stockist.findUnique({
      where: { id: dto.stockistId },
    });
    if (!stockist) throw new NotFoundException('Stockist not found');

    const total = dto.items.reduce(
      (sum, i) => sum.add(new Prisma.Decimal(i.rate).mul(i.quantity)),
      new Prisma.Decimal(0),
    );

    return this.prisma.challan.create({
      data: {
        number: `CH-${Date.now()}`,
        type: ChallanType.INBOUND,
        status: ChallanStatus.ISSUED,
        stockistId: dto.stockistId,
        items: dto.items as unknown as Prisma.InputJsonValue,
        totalAmount: total,
      },
    });
  }

  listChallans() {
    return this.prisma.challan.findMany({
      orderBy: { createdAt: 'desc' },
      include: { stockist: { select: { name: true } } },
    });
  }

  /** Challans addressed to the stockist linked to this user account. */
  async myChallans(userId: string) {
    const stockist = await this.prisma.stockist.findUnique({
      where: { userId },
    });
    if (!stockist) return [];
    return this.prisma.challan.findMany({
      where: { stockistId: stockist.id },
      orderBy: { createdAt: 'desc' },
      include: { stockist: { select: { name: true } } },
    });
  }

  /** Mark an inbound challan RECEIVED → increment inventory (GRN). */
  async receive(challanId: string) {
    const challan = await this.prisma.challan.findUnique({
      where: { id: challanId },
    });
    if (!challan) throw new NotFoundException('Challan not found');
    if (challan.type !== ChallanType.INBOUND) {
      throw new BadRequestException('Only inbound challans add stock');
    }
    if (challan.status === ChallanStatus.RECEIVED) {
      throw new BadRequestException('Challan already received');
    }

    const items = (challan.items as unknown as ChallanItem[]) ?? [];

    return this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (!item.productId) continue;
        await tx.inventory.upsert({
          where: { productId: item.productId },
          create: { productId: item.productId, quantity: item.quantity },
          update: { quantity: { increment: item.quantity } },
        });
      }
      return tx.challan.update({
        where: { id: challanId },
        data: { status: ChallanStatus.RECEIVED },
      });
    });
  }
}
