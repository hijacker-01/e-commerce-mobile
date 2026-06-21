import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReturnStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Customer requests a return on one of their own orders. */
  async request(userId: string, orderId: string, reason: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== userId) throw new ForbiddenException('Not your order');
    const existing = await this.prisma.return.findFirst({
      where: { orderId, status: { not: ReturnStatus.REJECTED } },
    });
    if (existing) throw new BadRequestException('Return already requested');

    return this.prisma.return.create({
      data: { orderId, userId, reason },
    });
  }

  listMine(userId: string) {
    return this.prisma.return.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { number: true } } },
    });
  }

  listAll() {
    return this.prisma.return.findMany({
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { number: true } } },
    });
  }

  /** Owner/employee decides on a return request. */
  async decide(id: string, decision: 'approve' | 'reject' | 'complete') {
    const ret = await this.prisma.return.findUnique({ where: { id } });
    if (!ret) throw new NotFoundException('Return not found');

    const status =
      decision === 'approve'
        ? ReturnStatus.APPROVED
        : decision === 'complete'
          ? ReturnStatus.COMPLETED
          : ReturnStatus.REJECTED;

    const updated = await this.prisma.return.update({
      where: { id },
      data: { status },
    });
    await this.notifications.create(
      ret.userId,
      'return',
      `Your return request is now ${status}`,
    );
    return updated;
  }
}
