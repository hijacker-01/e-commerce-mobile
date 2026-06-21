import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Record an ERP mutation (best-effort; never breaks the request). */
  async log(
    userId: string | null,
    action: string,
    entity: string,
    entityId?: string,
    meta: Prisma.InputJsonValue = {},
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action, entity, entityId, meta },
      });
    } catch (err) {
      this.logger.warn(`Audit log failed for ${entity}.${action}`);
    }
  }

  list() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true, role: true } } },
    });
  }
}
