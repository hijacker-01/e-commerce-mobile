import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ExchangeService } from './exchange.service';
import { SubmitExchangeDto, ReviewExchangeDto } from './dto/exchange.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchange: ExchangeService) {}

  @Roles(Role.CUSTOMER)
  @Post()
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitExchangeDto) {
    return this.exchange.submit(user.id, dto);
  }

  @Roles(Role.CUSTOMER)
  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.exchange.listMine(user.id);
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get()
  all() {
    return this.exchange.listAll();
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Patch(':id')
  review(@Param('id') id: string, @Body() dto: ReviewExchangeDto) {
    return this.exchange.review(id, dto);
  }
}
