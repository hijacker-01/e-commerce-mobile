import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCenterDto } from './dto/service-center.dto';

@Injectable()
export class ServiceCentersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateServiceCenterDto) {
    return this.prisma.serviceCenter.create({ data: dto });
  }

  /** Public directory: "Samsung service center near me" by brand + text. */
  search(brand?: string, q?: string) {
    const where: Prisma.ServiceCenterWhereInput = {};
    if (brand) where.brand = { equals: brand, mode: 'insensitive' };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.serviceCenter.findMany({ where, orderBy: { brand: 'asc' } });
  }

  remove(id: string) {
    return this.prisma.serviceCenter.delete({ where: { id } });
  }
}
