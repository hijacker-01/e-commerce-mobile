import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceType, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { computeGst, GstLine } from './gst.util';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generate a GST/standard invoice + warranty card from an approved order. */
  async createFromOrder(dto: CreateInvoiceDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        invoice: true,
        items: { include: { product: { include: { shop: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.invoice) {
      throw new ConflictException('Invoice already exists for this order');
    }
    if (order.status === OrderStatus.REQUESTED) {
      throw new BadRequestException('Order must be approved before billing');
    }
    if (order.items.length === 0) {
      throw new BadRequestException('Order has no items');
    }

    const shop = order.items[0].product.shop;
    const sellerGstin = shop?.gstin ?? null;

    const lines: GstLine[] = order.items.map((item) => ({
      taxableValue: item.unitPrice.mul(item.quantity),
      gstRate: item.gstRate,
    }));
    const gst = computeGst(lines, sellerGstin, dto.buyerGstin);

    const count = await this.prisma.invoice.count();
    const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Warranty card from the first product (months read from its specs).
    const primary = order.items[0].product;
    const specs = (primary.specs ?? {}) as Record<string, unknown>;
    const months =
      typeof specs.warrantyMonths === 'number' ? specs.warrantyMonths : 12;

    return this.prisma.invoice.create({
      data: {
        number,
        orderId: order.id,
        type: dto.type ?? InvoiceType.GST,
        buyerGstin: dto.buyerGstin,
        sellerGstin,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        total: gst.total,
        warrantyCard: {
          create: {
            serialOrImei: dto.serialOrImei,
            brand: primary.brand,
            model: primary.model,
            months,
          },
        },
      },
      include: { warrantyCard: true },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { warrantyCard: true, order: { include: { items: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  /** GST summary report for a date range (basis for GST returns / claims). */
  async gstReport(from?: string, to?: string) {
    const where: Prisma.InvoiceWhereInput = { type: InvoiceType.GST };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const invoices = await this.prisma.invoice.findMany({ where });
    const sum = (key: 'cgst' | 'sgst' | 'igst' | 'total') =>
      invoices.reduce((acc, i) => acc.add(i[key]), new Prisma.Decimal(0));
    return {
      count: invoices.length,
      cgst: sum('cgst'),
      sgst: sum('sgst'),
      igst: sum('igst'),
      total: sum('total'),
    };
  }
}
