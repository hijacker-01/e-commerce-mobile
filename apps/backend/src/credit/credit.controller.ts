import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CreditService } from './credit.service';
import { SetCreditTermsDto, LedgerEntryDto } from './dto/credit.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('credit')
export class CreditController {
  constructor(private readonly credit: CreditService) {}

  @Roles(Role.CUSTOMER)
  @Post('apply')
  apply(@CurrentUser() user: AuthUser) {
    return this.credit.apply(user.id);
  }

  @Roles(Role.CUSTOMER)
  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.credit.getMine(user.id);
  }

  // Owner sets the credit model / terms per customer.
  @Roles(Role.OWNER)
  @Put(':userId/terms')
  setTerms(@Param('userId') userId: string, @Body() dto: SetCreditTermsDto) {
    return this.credit.setTerms(userId, dto);
  }

  @Roles(Role.OWNER)
  @Post(':userId/ledger')
  ledger(@Param('userId') userId: string, @Body() dto: LedgerEntryDto) {
    return this.credit.addLedgerEntry(userId, dto);
  }
}
