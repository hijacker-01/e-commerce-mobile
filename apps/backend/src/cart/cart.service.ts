import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
  ) {}

  /** Get the user's cart with line totals + grand total. */
  async get(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { items: { include: { product: true } } },
    });

    // Apply any bargain prices the owner accepted for THIS customer.
    const bargains = await this.chat.acceptedPricesFor(
      userId,
      cart.items.map((i) => i.productId),
    );

    let subtotal = new Prisma.Decimal(0);
    const items = cart.items.map((item) => {
      const bargain = bargains.get(item.productId);
      // Use the accepted offer only when it beats the list price.
      const isBargained = !!bargain && bargain.lt(item.product.price);
      const unit = isBargained ? bargain! : item.product.price;
      const lineTotal = unit.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
      return {
        id: item.id,
        productId: item.productId,
        title: item.product.title,
        unitPrice: unit.toString(),
        listPrice: item.product.price.toString(),
        bargained: isBargained,
        quantity: item.quantity,
        lineTotal: lineTotal.toString(),
      };
    });

    return { id: cart.id, items, subtotal: subtotal.toString() };
  }

  async add(userId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || !product.isActive) {
      throw new BadRequestException('Product not available');
    }
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    // Increment if the line already exists.
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return this.get(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException('Cart is empty');

    if (quantity === 0) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
    } else {
      await this.prisma.cartItem.update({
        where: { cartId_productId: { cartId: cart.id, productId } },
        data: { quantity },
      });
    }
    return this.get(userId);
  }

  async clear(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return this.get(userId);
  }
}
