import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
  ) {}

  @Roles(Role.CUSTOMER)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.orders.findForUser(user);
  }

  // Owner, or an employee with 'order.approve', can advance order status.
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @RequirePermissions('order.approve')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    const order = await this.orders.updateStatus(id, dto.status, user);
    await this.audit.log(user.id, `status:${dto.status}`, 'order', id);
    return order;
  }
}
