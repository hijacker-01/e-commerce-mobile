import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Complete export of everything tied to a user id — the personal data
   * backup a customer can download and keep for recovery.
   */
  async exportUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: { include: { items: true, invoice: true } },
        reviews: true,
        questions: true,
        returns: true,
        exchanges: true,
        notifications: true,
        wishlist: {
          include: { product: { select: { id: true, title: true } } },
        },
        cart: { include: { items: true } },
        creditAccount: { include: { ledger: true } },
        chatThreads: { include: { messages: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Never include the password hash in an export.
    const { passwordHash: _omit, ...account } = user as Record<string, unknown>;

    return {
      format: 'voltora-account-backup',
      version: 1,
      generatedAt: new Date().toISOString(),
      userId,
      counts: {
        orders: user.orders.length,
        reviews: user.reviews.length,
        questions: user.questions.length,
        returns: user.returns.length,
        exchanges: user.exchanges.length,
        notifications: user.notifications.length,
        wishlist: user.wishlist.length,
        cartItems: user.cart?.items.length ?? 0,
        chatThreads: user.chatThreads.length,
      },
      account,
    };
  }
}
