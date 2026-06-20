import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateOfferInput {
  title: string;
  bannerUrl?: string;
  startsAt: string;
  endsAt: string;
}

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOfferInput) {
    return this.prisma.offer.create({
      data: {
        title: dto.title,
        bannerUrl: dto.bannerUrl,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });
  }

  /** Sales offers currently live (now within the offer window). */
  listActive() {
    const now = new Date();
    return this.prisma.offer.findMany({
      where: { startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: 'asc' },
    });
  }
}
