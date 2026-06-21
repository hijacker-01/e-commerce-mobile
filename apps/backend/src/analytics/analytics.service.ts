import { Injectable } from '@nestjs/common';
import { InvoiceType, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Owner dashboard: revenue, orders, top products, inventory, GST. */
  async summary() {
    const [revenue, byStatus, topItems, inventories, gst] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: { paymentStatus: PaymentStatus.PAID },
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.inventory.findMany({
        include: { product: { select: { title: true, price: true } } },
      }),
      this.prisma.invoice.aggregate({
        _sum: { cgst: true, sgst: true, igst: true },
        where: { type: InvoiceType.GST },
      }),
    ]);

    // Inventory valuation + low-stock (column-vs-column compare done in JS).
    let inventoryValue = new Prisma.Decimal(0);
    let lowStock = 0;
    for (const inv of inventories) {
      inventoryValue = inventoryValue.add(
        inv.product.price.mul(inv.quantity),
      );
      if (inv.quantity <= inv.reorderLevel) lowStock++;
    }

    // Attach product titles to the top sellers.
    const products = await this.prisma.product.findMany({
      where: { id: { in: topItems.map((t) => t.productId) } },
      select: { id: true, title: true },
    });
    const titleById = new Map(products.map((p) => [p.id, p.title]));
    const topProducts = topItems.map((t) => ({
      productId: t.productId,
      title: titleById.get(t.productId) ?? t.productId,
      unitsSold: t._sum.quantity ?? 0,
    }));

    const gstCollected = (gst._sum.cgst ?? new Prisma.Decimal(0))
      .add(gst._sum.sgst ?? 0)
      .add(gst._sum.igst ?? 0);

    return {
      revenuePaid: (revenue._sum.total ?? new Prisma.Decimal(0)).toString(),
      paidOrders: revenue._count,
      ordersByStatus: Object.fromEntries(
        byStatus.map((s) => [s.status, s._count._all]),
      ),
      topProducts,
      inventoryValue: inventoryValue.toString(),
      lowStockCount: lowStock,
      gstCollected: gstCollected.toString(),
    };
  }
}
