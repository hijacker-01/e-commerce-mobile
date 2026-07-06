import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferMessageStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /** One thread per customer+product; reused for an ongoing bargain. */
  async getOrCreateThread(customerId: string, productId?: string) {
    const existing = await this.prisma.chatThread.findFirst({
      where: { customerId, productId: productId ?? null },
    });
    if (existing) return existing;
    return this.prisma.chatThread.create({
      data: { customerId, productId },
    });
  }

  async listThreads(user: AuthUser) {
    // Customers see their own threads; staff see all.
    const where: Prisma.ChatThreadWhereInput =
      user.role === Role.CUSTOMER ? { customerId: user.id } : {};
    return this.prisma.chatThread.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { title: true } } },
    });
  }

  listMessages(threadId: string) {
    return this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  addMessage(threadId: string, senderId: string, body: string) {
    return this.prisma.message.create({
      data: { threadId, senderId, body },
    });
  }

  /** Structured bargaining offer (price proposal) inside a thread. */
  makeOffer(threadId: string, senderId: string, amount: number) {
    return this.prisma.message.create({
      data: {
        threadId,
        senderId,
        offerAmount: new Prisma.Decimal(amount),
        offerStatus: OfferMessageStatus.PENDING,
      },
    });
  }

  /**
   * The accepted bargain price (if any) for each of the given products, for a
   * specific customer. Uses the most recent staff-ACCEPTED offer in that
   * customer's thread for the product. Returned prices apply only to that
   * customer's own cart/orders.
   */
  async acceptedPricesFor(
    customerId: string,
    productIds: string[],
  ): Promise<Map<string, Prisma.Decimal>> {
    const map = new Map<string, Prisma.Decimal>();
    if (productIds.length === 0) return map;
    const msgs = await this.prisma.message.findMany({
      where: {
        offerStatus: OfferMessageStatus.ACCEPTED,
        offerAmount: { not: null },
        thread: { customerId, productId: { in: productIds } },
      },
      include: { thread: { select: { productId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    for (const m of msgs) {
      const pid = m.thread.productId;
      if (pid && m.offerAmount != null && !map.has(pid)) {
        map.set(pid, m.offerAmount);
      }
    }
    return map;
  }

  async respondOffer(messageId: string, status: OfferMessageStatus) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!msg || msg.offerAmount == null) {
      throw new NotFoundException('Offer not found');
    }
    if (msg.offerStatus !== OfferMessageStatus.PENDING) {
      throw new ForbiddenException('Offer already resolved');
    }
    return this.prisma.message.update({
      where: { id: messageId },
      data: { offerStatus: status },
    });
  }
}
