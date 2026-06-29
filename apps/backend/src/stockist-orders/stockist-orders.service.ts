import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// When the owner hasn't set a wholesale price, fall back to this share of retail.
const STOCKIST_PRICE_FALLBACK = 0.85;

type ProdPrice = { price: Prisma.Decimal; stockistPrice: Prisma.Decimal | null };

@Injectable()
export class StockistOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private effectivePrice(p: ProdPrice): Prisma.Decimal {
    return p.stockistPrice ?? p.price.mul(STOCKIST_PRICE_FALLBACK);
  }

  /** Wholesale catalog shown to stockists (stockist prices, not retail). */
  async catalog() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        inventory: { select: { quantity: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => ({
      id: p.id,
      brand: p.brand,
      model: p.model,
      title: p.title,
      media: p.media,
      category: p.category?.name ?? null,
      retail: p.price.toString(),
      stockistPrice: this.effectivePrice(p).toFixed(2),
      inStock: p.inventory?.quantity ?? 0,
    }));
  }

  private async stockistForUser(userId: string) {
    const s = await this.prisma.stockist.findUnique({ where: { userId } });
    if (!s) throw new BadRequestException('No stockist profile for this account');
    return s;
  }

  /** Stockist submits a wholesale order request. */
  async placeOrder(
    userId: string,
    dto: { items: { productId: string; qty: number }[]; note?: string },
  ) {
    const stockist = await this.stockistForUser(userId);
    const wanted = (dto.items ?? []).filter((i) => i.qty > 0);
    if (wanted.length === 0) throw new BadRequestException('No items selected');

    const products = await this.prisma.product.findMany({
      where: { id: { in: wanted.map((i) => i.productId) } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    const items = wanted.map((i) => {
      const p = byId.get(i.productId);
      if (!p) throw new BadRequestException('Product not found');
      const unitPrice = this.effectivePrice(p);
      subtotal = subtotal.add(unitPrice.mul(i.qty));
      return {
        productId: p.id,
        name: p.title,
        qty: i.qty,
        unitPrice: unitPrice.toFixed(2),
      };
    });

    return this.prisma.stockistOrder.create({
      data: {
        stockistId: stockist.id,
        items: items as unknown as Prisma.InputJsonValue,
        note: dto.note,
        subtotal,
        total: subtotal,
      },
    });
  }

  async myOrders(userId: string) {
    const stockist = await this.stockistForUser(userId);
    return this.prisma.stockistOrder.findMany({
      where: { stockistId: stockist.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Owner/employee — all stockist order requests. */
  listAll() {
    return this.prisma.stockistOrder.findMany({
      include: { stockist: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Owner approves (apply scheme + generate challan) or rejects a request. */
  async decide(
    id: string,
    dto: {
      decision: 'approve' | 'reject';
      discountPct?: number;
      freeUnits?: number;
      note?: string;
    },
  ) {
    const order = await this.prisma.stockistOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'REQUESTED')
      throw new BadRequestException('This request has already been decided');

    if (dto.decision === 'reject') {
      return this.prisma.stockistOrder.update({
        where: { id },
        data: { status: 'REJECTED', schemeNote: dto.note },
      });
    }

    const discountPct = new Prisma.Decimal(dto.discountPct ?? 0);
    const discount = order.subtotal.mul(discountPct).div(100);
    const total = order.subtotal.sub(discount);
    const freeUnits = dto.freeUnits ?? 0;

    const orderItems = (order.items as unknown as {
      productId: string;
      name: string;
      qty: number;
      unitPrice: string;
    }[]).map((it) => ({
      productId: it.productId,
      name: it.name,
      qty: it.qty,
      rate: Number(it.unitPrice),
    }));
    if (freeUnits > 0) {
      orderItems.push({
        productId: '',
        name: `Scheme: ${freeUnits} free unit(s)`,
        qty: freeUnits,
        rate: 0,
      });
    }

    // Dispatch challan (shop → stockist) for the approved order.
    const challan = await this.prisma.challan.create({
      data: {
        number: `CH-${Date.now()}`,
        type: 'OUTBOUND',
        status: 'ISSUED',
        stockistId: order.stockistId,
        items: orderItems as unknown as Prisma.InputJsonValue,
        totalAmount: total,
      },
    });

    return this.prisma.stockistOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        schemeDiscountPct: discountPct,
        schemeFreeUnits: freeUnits,
        schemeNote: dto.note,
        total,
        challanId: challan.id,
      },
    });
  }
}
