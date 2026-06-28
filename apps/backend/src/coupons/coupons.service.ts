import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Coupon, CouponType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/coupon.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        type: dto.type,
        value: new Prisma.Decimal(dto.value),
        minOrder: new Prisma.Decimal(dto.minOrder ?? 0),
        usageLimit: dto.usageLimit,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  listActive() {
    return this.prisma.coupon.findMany({ where: { isActive: true } });
  }

  /**
   * Coupons that can actually be applied to the user's current cart — honouring
   * min-order, expiry, usage limit and product/category scope. De-duplicated to
   * distinct offers and sorted by the biggest saving first.
   */
  async applicableForCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, categoryId: true, price: true } },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) return [];

    let subtotal = new Prisma.Decimal(0);
    const productIds = new Set<string>();
    const categoryIds = new Set<string>();
    for (const it of cart.items) {
      subtotal = subtotal.add(it.product.price.mul(it.quantity));
      productIds.add(it.product.id);
      categoryIds.add(it.product.categoryId);
    }

    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: { isActive: true },
    });

    const seen = new Set<string>();
    const out: Array<{
      id: string;
      code: string;
      type: CouponType;
      value: string;
      minOrder: string;
      discount: string;
    }> = [];

    for (const c of coupons) {
      if (c.expiresAt && c.expiresAt < now) continue;
      if (c.usageLimit != null && c.usedCount >= c.usageLimit) continue;
      if (subtotal.lt(c.minOrder)) continue;

      const scope = (c.scope ?? {}) as {
        productIds?: string[];
        categoryIds?: string[];
      };
      const scoped =
        (scope.productIds?.length ?? 0) > 0 ||
        (scope.categoryIds?.length ?? 0) > 0;
      if (scoped) {
        const matchP = scope.productIds?.some((p) => productIds.has(p)) ?? false;
        const matchC =
          scope.categoryIds?.some((cid) => categoryIds.has(cid)) ?? false;
        if (!matchP && !matchC) continue;
      }

      // Collapse identical offers (many auto-generated codes share terms).
      const sig = `${c.type}:${c.value.toString()}:${c.minOrder.toString()}:${scoped}`;
      if (seen.has(sig)) continue;
      seen.add(sig);

      const raw =
        c.type === CouponType.PERCENT
          ? subtotal.mul(c.value).div(100)
          : new Prisma.Decimal(c.value);
      const discount = Prisma.Decimal.min(raw, subtotal);

      out.push({
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value.toString(),
        minOrder: c.minOrder.toString(),
        discount: discount.toFixed(2),
      });
    }

    out.sort((a, b) => Number(b.discount) - Number(a.discount));
    return out.slice(0, 6);
  }

  /** Validate a coupon against a subtotal and return the discount. */
  private discountFor(coupon: Coupon, subtotal: Prisma.Decimal): Prisma.Decimal {
    if (!coupon.isActive) throw new BadRequestException('Coupon inactive');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Coupon expired');
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (subtotal.lt(coupon.minOrder)) {
      throw new BadRequestException(
        `Minimum order of ${coupon.minOrder.toString()} required`,
      );
    }
    const raw =
      coupon.type === CouponType.PERCENT
        ? subtotal.mul(coupon.value).div(100)
        : coupon.value;
    // Never discount below zero.
    return Prisma.Decimal.min(new Prisma.Decimal(raw), subtotal);
  }

  /** Apply a coupon to the customer's order and recompute the total. */
  async applyToOrder(orderId: string, code: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.id) throw new ForbiddenException('Not your order');

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    const discount = this.discountFor(coupon, order.subtotal);
    const total = order.subtotal.add(order.gstAmount).sub(discount);

    return this.prisma.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
      return tx.order.update({
        where: { id: order.id },
        data: { couponId: coupon.id, discount, total },
      });
    });
  }
}
