import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly prisma: PrismaService) {}

  // Customer's loyalty balance (earned at 1 point per ₹100 spent).
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { loyaltyPoints: true },
    });
    return { points: u?.loyaltyPoints ?? 0 };
  }
}
