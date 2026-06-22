import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StockistsService } from './stockists.service';
import { CreateStockistDto, CreateChallanDto } from './dto/stockist.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

// Stockist registry + inbound supply challans (owner/employee operated).
@Roles(Role.OWNER, Role.EMPLOYEE)
@Controller('stockists')
export class StockistsController {
  constructor(private readonly stockists: StockistsService) {}

  @Post()
  create(@Body() dto: CreateStockistDto) {
    return this.stockists.create(dto);
  }

  @Get()
  list() {
    return this.stockists.list();
  }

  // Stockist's own portal — read-only view of challans addressed to them.
  @Roles(Role.STOCKIST)
  @Get('me/challans')
  myChallans(@CurrentUser() user: AuthUser) {
    return this.stockists.myChallans(user.id);
  }

  @RequirePermissions('challan.create')
  @Post('challans')
  createChallan(@Body() dto: CreateChallanDto) {
    return this.stockists.createChallan(dto);
  }

  @Get('challans')
  listChallans() {
    return this.stockists.listChallans();
  }

  @RequirePermissions('inventory.write')
  @Post('challans/:id/receive')
  receive(@Param('id') id: string) {
    return this.stockists.receive(id);
  }
}
