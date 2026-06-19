import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LobbyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public curated storefront ("owner's picks"), ordered by position. */
  list() {
    return this.prisma.specialLobbyItem.findMany({
      orderBy: { position: 'asc' },
      include: { product: true },
    });
  }

  add(productId: string, position = 0, bannerUrl?: string) {
    return this.prisma.specialLobbyItem.upsert({
      where: { productId },
      create: { productId, position, bannerUrl },
      update: { position, bannerUrl },
    });
  }

  remove(productId: string) {
    return this.prisma.specialLobbyItem.delete({ where: { productId } });
  }
}
