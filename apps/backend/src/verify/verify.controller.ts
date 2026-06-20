import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

// Genuine-product / warranty verification by serial or IMEI.
@Controller('verify')
export class VerifyController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('imei/:serial')
  async verify(@Param('serial') serial: string) {
    const card = await this.prisma.warrantyCard.findFirst({
      where: { serialOrImei: serial },
      include: { invoice: { select: { number: true } } },
    });
    if (!card) {
      return { genuine: false };
    }
    const validTill = new Date(card.startDate);
    validTill.setMonth(validTill.getMonth() + card.months);
    return {
      genuine: true,
      brand: card.brand,
      model: card.model,
      warrantyMonths: card.months,
      validTill: validTill.toISOString().slice(0, 10),
      invoice: card.invoice?.number,
    };
  }
}
