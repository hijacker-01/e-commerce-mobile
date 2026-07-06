import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma, Role } from '@prisma/client';

// Store policy: instant discount when paying by Credit Card.
const CARD_OFFER_PERCENT = 5;
const CARD_OFFER_CAP = 2000;
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/order.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly chat: ChatService,
  ) {}

  /** Customer places an order; starts as REQUESTED, awaiting approval. */
  async create(customerId: string, dto: CreateOrderDto) {
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    const priceById = new Map(products.map((p) => [p.id, p]));
    // Bargain prices the owner accepted for this customer override list price.
    const bargains = await this.chat.acceptedPricesFor(customerId, productIds);
    let subtotal = new Prisma.Decimal(0);
    let gstAmount = new Prisma.Decimal(0);

    const items = dto.items.map((item) => {
      const product = priceById.get(item.productId)!;
      const bargain = bargains.get(item.productId);
      const unitPrice =
        bargain && bargain.lt(product.price) ? bargain : product.price;
      const lineTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
      gstAmount = gstAmount.add(lineTotal.mul(product.gstRate).div(100));
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        gstRate: product.gstRate,
      };
    });

    // Credit-card offer: 5% instant off (capped), applied at order creation.
    let discount = new Prisma.Decimal(0);
    if (dto.paymentMethod === PaymentMethod.CREDIT_CARD) {
      const raw = subtotal.mul(CARD_OFFER_PERCENT).div(100);
      discount = Prisma.Decimal.min(raw, new Prisma.Decimal(CARD_OFFER_CAP));
      discount = Prisma.Decimal.min(discount, subtotal);
    }
    const total = subtotal.add(gstAmount).sub(discount);

    return this.prisma.order.create({
      data: {
        number: `ORD-${Date.now()}`,
        customerId,
        deliverySlot: dto.deliverySlot ? new Date(dto.deliverySlot) : undefined,
        deliveryAddr: dto.deliveryAddr,
        paymentMethod: dto.paymentMethod,
        subtotal,
        gstAmount,
        discount,
        total,
        items: { create: items },
      },
      include: { items: true },
    });
  }

  async findForUser(user: AuthUser) {
    // Customers see only their own orders; staff see all.
    const where: Prisma.OrderWhereInput =
      user.role === Role.CUSTOMER ? { customerId: user.id } : {};
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, invoice: true },
    });
  }

  /** Single order with product details, scoped to the requesting user. */
  async findOne(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true, media: true } },
          },
        },
        invoice: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (user.role === Role.CUSTOMER && order.customerId !== user.id) {
      throw new ForbiddenException('Not your order');
    }
    return order;
  }

  /** Owner/employee approves or advances order status. */
  async updateStatus(orderId: string, status: OrderStatus, approver: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (status === OrderStatus.APPROVED && approver.role === Role.CUSTOMER) {
      throw new ForbiddenException('Customers cannot approve orders');
    }

    // Decrement stock once, on the first approval (REQUESTED -> APPROVED).
    const isFirstApproval =
      status === OrderStatus.APPROVED &&
      order.status === OrderStatus.REQUESTED;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (isFirstApproval) {
        for (const item of order.items) {
          const inv = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });
          if (!inv || inv.quantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product ${item.productId}`,
            );
          }
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
        // Award loyalty points: 1 point per ₹100 of order total.
        const points = Math.floor(Number(order.total) / 100);
        if (points > 0) {
          await tx.user.update({
            where: { id: order.customerId },
            data: { loyaltyPoints: { increment: points } },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status,
          approverId:
            status === OrderStatus.APPROVED ? approver.id : order.approverId,
        },
      });
    });

    // Notify the customer of the status change (best-effort, post-commit).
    await this.notifications.create(
      order.customerId,
      'order',
      `Order ${order.number} is now ${status}`,
      undefined,
    );

    return updated;
  }
}
