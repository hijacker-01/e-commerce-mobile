import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  /** Create a review; mark verified if the user actually bought the product. */
  async create(userId: string, dto: CreateReviewDto) {
    const purchased = await this.prisma.order.findFirst({
      where: {
        customerId: userId,
        items: { some: { productId: dto.productId } },
        OR: [
          { status: OrderStatus.DELIVERED },
          { paymentStatus: PaymentStatus.PAID },
        ],
      },
      select: { id: true },
    });

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        rating: dto.rating,
        text: dto.text,
        photos: dto.photos ?? [],
        verified: !!purchased,
      },
    });
  }

  listForProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
  }

  /** AI pros/cons + sentiment summary across a product's reviews. */
  async summary(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      select: { rating: true, text: true },
      take: 100,
    });
    return this.ai.summarizeReviews(reviews);
  }
}
