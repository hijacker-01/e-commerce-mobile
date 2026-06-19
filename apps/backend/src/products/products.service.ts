import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductQueryDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        shopId: dto.shopId,
        categoryId: dto.categoryId,
        brand: dto.brand,
        model: dto.model,
        title: dto.title,
        description: dto.description,
        specs: (dto.specs ?? {}) as Prisma.InputJsonValue,
        price: new Prisma.Decimal(dto.price),
        mrp: dto.mrp != null ? new Prisma.Decimal(dto.mrp) : undefined,
        hsnCode: dto.hsnCode,
        gstRate: dto.gstRate != null ? new Prisma.Decimal(dto.gstRate) : undefined,
        condition: dto.condition,
        media: dto.media ?? [],
        videoLinks: dto.videoLinks ?? [],
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { inventory: true, category: true, reviews: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /** Faceted listing for the smart-filter storefront. */
  list(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {};
    if (query.activeOnly !== false) where.isActive = true;
    if (query.brand) where.brand = query.brand;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.minPrice != null || query.maxPrice != null) {
      where.price = {};
      if (query.minPrice != null) where.price.gte = new Prisma.Decimal(query.minPrice);
      if (query.maxPrice != null) where.price.lte = new Prisma.Decimal(query.maxPrice);
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { brand: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { inventory: true },
    });
  }
}
