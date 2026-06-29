import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpecialService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public Special Store — active deals with product details. */
  async list() {
    const offers = await this.prisma.specialOffer.findMany({
      where: { isActive: true },
      include: {
        product: {
          include: {
            inventory: { select: { quantity: true } },
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return offers.map((o) => ({
      id: o.id,
      productId: o.productId,
      title: o.product.title,
      brand: o.product.brand,
      model: o.product.model,
      media: o.product.media,
      category: o.product.category?.name ?? null,
      specialPrice: o.specialPrice.toString(),
      originalPrice: o.originalPrice.toString(),
      lowestPrice: o.lowestPrice.toString(),
      inStock: o.product.inventory?.quantity ?? 0,
    }));
  }

  /** Owner shifts a product into the Special Store at a special price. */
  async upsert(productId: string, specialPrice: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const sp = new Prisma.Decimal(specialPrice);
    const existing = await this.prisma.specialOffer.findUnique({
      where: { productId },
    });
    // Capture the genuine original price once (before it was ever specialised).
    const originalPrice = existing?.originalPrice ?? product.price;
    // Yearly lowest = the lowest the price has ever dropped to.
    const lowestPrice = Prisma.Decimal.min(
      sp,
      existing?.lowestPrice ?? sp,
      product.lowestPrice ?? sp,
    );

    await this.prisma.$transaction([
      this.prisma.specialOffer.upsert({
        where: { productId },
        update: { specialPrice: sp, lowestPrice, isActive: true },
        create: { productId, specialPrice: sp, originalPrice, lowestPrice },
      }),
      // Special price becomes the effective price; keep MRP for the
      // strike-through and lower the product's tracked yearly-lowest.
      this.prisma.product.update({
        where: { id: productId },
        data: { price: sp, mrp: product.mrp ?? originalPrice, lowestPrice },
      }),
    ]);
    return { ok: true };
  }

  /** Owner removes a product from the Special Store — restore its price. */
  async remove(productId: string) {
    const offer = await this.prisma.specialOffer.findUnique({
      where: { productId },
    });
    if (!offer) throw new NotFoundException('Not in the Special Store');
    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { price: offer.originalPrice },
      }),
      this.prisma.specialOffer.delete({ where: { productId } }),
    ]);
    return { ok: true };
  }
}
