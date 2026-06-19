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
