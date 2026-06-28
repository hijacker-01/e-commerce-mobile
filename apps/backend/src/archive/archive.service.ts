import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArchiveStorage, LocalArchiveStorage } from './storage';

// Orders safe to offload — completed/closed sales only, never in-flight ones.
const TERMINAL: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
];

@Injectable()
export class ArchiveService {
  // Swap for GoogleDriveArchiveStorage when credentials are configured.
  private readonly storage: ArchiveStorage = new LocalArchiveStorage();

  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.storage.list();
  }

  /** Export matching orders + sales (invoices) to a file, then hard-purge them. */
  async archive(scope: 'terminal' | 'all') {
    const where: Prisma.OrderWhereInput =
      scope === 'all' ? {} : { status: { in: TERMINAL } };

    const orders = await this.prisma.order.findMany({
      where,
      include: { items: true, invoice: true, returns: true },
      orderBy: { createdAt: 'asc' },
    });
    if (orders.length === 0) {
      return { archived: 0, message: 'No matching orders to archive.' };
    }

    const totalSales = orders
      .reduce((s, o) => s + Number(o.total), 0)
      .toFixed(2);
    const payload = {
      format: 'voltora-orders-archive',
      version: 1,
      generatedAt: new Date().toISOString(),
      scope,
      count: orders.length,
      totalSales,
      orders,
    };
    const name = `orders-archive-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.json`;
    const file = await this.storage.save(name, JSON.stringify(payload, null, 2));

    // Only purge once the file is safely written.
    const ids = orders.map((o) => o.id);
    const invoiceIds = orders
      .map((o) => o.invoice?.id)
      .filter((x): x is string => !!x);
    await this.prisma.$transaction(async (tx) => {
      if (invoiceIds.length)
        await tx.warrantyCard.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
      await tx.return.deleteMany({ where: { orderId: { in: ids } } });
      await tx.invoice.deleteMany({ where: { orderId: { in: ids } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: ids } } });
      // Supply challans referencing these orders: detach (keep the challan).
      await tx.challan.updateMany({
        where: { orderId: { in: ids } },
        data: { orderId: null },
      });
      await tx.order.deleteMany({ where: { id: { in: ids } } });
    });

    return {
      archived: orders.length,
      totalSales,
      file: file.name,
      storage: this.storage.kind,
    };
  }

  /** Return a stored archive's parsed content (for download / inspection). */
  async getFile(id: string) {
    try {
      return JSON.parse(await this.storage.read(id));
    } catch {
      throw new NotFoundException('Archive not found');
    }
  }

  /** Re-import an archive's orders/sales back into the database. */
  async restore(id: string) {
    let payload: { orders?: Record<string, any>[] };
    try {
      payload = JSON.parse(await this.storage.read(id));
    } catch {
      throw new NotFoundException('Archive not found');
    }
    const orders = payload.orders ?? [];
    if (!Array.isArray(orders))
      throw new BadRequestException('Invalid archive file');

    let restored = 0;
    let skipped = 0;
    const failed: string[] = [];

    for (const o of orders) {
      const exists = await this.prisma.order.findUnique({ where: { id: o.id } });
      if (exists) {
        skipped++;
        continue;
      }
      try {
        await this.prisma.order.create({
          data: {
            id: o.id,
            number: o.number,
            customerId: o.customerId,
            status: o.status,
            approverId: o.approverId ?? null,
            deliverySlot: o.deliverySlot ?? null,
            deliveryAddr: o.deliveryAddr ?? null,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            paymentRef: o.paymentRef ?? null,
            subtotal: o.subtotal,
            discount: o.discount,
            gstAmount: o.gstAmount,
            total: o.total,
            couponId: o.couponId ?? null,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
            items: {
              create: (o.items ?? []).map((it: Record<string, any>) => ({
                id: it.id,
                productId: it.productId,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                gstRate: it.gstRate,
              })),
            },
            ...(o.invoice
              ? {
                  invoice: {
                    create: {
                      id: o.invoice.id,
                      number: o.invoice.number,
                      type: o.invoice.type,
                      buyerGstin: o.invoice.buyerGstin ?? null,
                      sellerGstin: o.invoice.sellerGstin ?? null,
                      cgst: o.invoice.cgst,
                      sgst: o.invoice.sgst,
                      igst: o.invoice.igst,
                      total: o.invoice.total,
                      pdfUrl: o.invoice.pdfUrl ?? null,
                      irn: o.invoice.irn ?? null,
                      createdAt: o.invoice.createdAt,
                    },
                  },
                }
              : {}),
            returns: {
              create: (o.returns ?? []).map((r: Record<string, any>) => ({
                id: r.id,
                userId: r.userId,
                reason: r.reason,
                status: r.status,
                createdAt: r.createdAt,
              })),
            },
          },
        });
        restored++;
      } catch {
        // e.g. the customer or a product no longer exists.
        failed.push(o.number ?? o.id);
      }
    }
    return { restored, skipped, failed, total: orders.length };
  }

  async deleteArchive(id: string) {
    await this.storage.remove(id);
    return { deleted: true };
  }
}
