import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
      },
    });
  }

  /** Owner toggles granular permission flags for an employee. */
  async setPermissions(userId: string, permissions: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { permissions },
      select: { id: true, role: true, permissions: true },
    });
  }
}
