import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const EMPLOYEE_PERMS = [
  'order.approve',
  'product.write',
  'invoice.create',
  'inventory.write',
  'coupon.create',
  'challan.create',
];

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

  /** Owner's staff roster — employees and stockists. */
  listStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.EMPLOYEE, Role.STOCKIST] } },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Owner provisions an employee or a stockist (with a login account). */
  async createStaff(input: {
    name: string;
    phone: string;
    password: string;
    role: string;
    permissions?: string[];
    gstin?: string;
  }) {
    if (input.role !== 'EMPLOYEE' && input.role !== 'STOCKIST') {
      throw new BadRequestException('Role must be EMPLOYEE or STOCKIST');
    }
    const existing = await this.prisma.user.findUnique({
      where: { phone: input.phone },
    });
    if (existing) throw new BadRequestException('Phone already registered');

    const passwordHash = await bcrypt.hash(input.password, 10);

    if (input.role === 'STOCKIST') {
      return this.prisma.user.create({
        data: {
          name: input.name,
          phone: input.phone,
          role: Role.STOCKIST,
          passwordHash,
          stockist: {
            create: {
              name: input.name,
              gstin: input.gstin || undefined,
              contact: input.phone,
            },
          },
        },
        select: { id: true, name: true, phone: true, role: true, isActive: true },
      });
    }

    return this.prisma.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        role: Role.EMPLOYEE,
        passwordHash,
        permissions: input.permissions?.length
          ? input.permissions
          : EMPLOYEE_PERMS,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        permissions: true,
      },
    });
  }

  /** Remove a staff account — hard delete, or deactivate if it has history. */
  async removeStaff(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { stockist: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== Role.EMPLOYEE && user.role !== Role.STOCKIST) {
      throw new BadRequestException('Only staff accounts can be removed here');
    }
    try {
      if (user.stockist) {
        await this.prisma.stockist.delete({ where: { id: user.stockist.id } });
      }
      await this.prisma.user.delete({ where: { id } });
      return { removed: true, deactivated: false };
    } catch {
      // Has references (approved orders, challans, audit) — disable login instead.
      await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      return { removed: true, deactivated: true };
    }
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
