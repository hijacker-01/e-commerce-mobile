import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyPaymentDto } from './dto/payment.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PaymentsService {
  private readonly client: Razorpay | null;
  private readonly keyId?: string;
  private readonly keySecret?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    this.client =
      this.keyId && this.keySecret
        ? new Razorpay({ key_id: this.keyId, key_secret: this.keySecret })
        : null;
  }

  /** Create a Razorpay order for an existing app order; returns checkout data. */
  async createForOrder(orderId: string, user: AuthUser) {
    if (!this.client || !this.keyId) {
      throw new ServiceUnavailableException('Payments not configured');
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.id) {
      throw new ForbiddenException('Not your order');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order already paid');
    }

    // Razorpay amounts are integer paise.
    const amount = Math.round(Number(order.total) * 100);
    const rzpOrder = await this.client.orders.create({
      amount,
      currency: 'INR',
      receipt: order.number,
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentRef: rzpOrder.id },
    });

    return {
      keyId: this.keyId,
      razorpayOrderId: rzpOrder.id,
      amount,
      currency: 'INR',
      orderNumber: order.number,
    };
  }

  /** Verify Razorpay's HMAC signature and mark the order paid. */
  async verify(dto: VerifyPaymentDto, user: AuthUser) {
    if (!this.keySecret) {
      throw new ServiceUnavailableException('Payments not configured');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.id) {
      throw new ForbiddenException('Not your order');
    }

    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    const valid =
      expected.length === dto.razorpaySignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(dto.razorpaySignature),
      );
    if (!valid) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Invalid payment signature');
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.PAID },
    });
  }
}
