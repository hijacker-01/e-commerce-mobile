import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';
import { StockistOrdersService } from './stockist-orders.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

class OrderItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

class PlaceOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

class DecideDto {
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @IsOptional()
  @IsNumber()
  discountPct?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeUnits?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('stockist-orders')
export class StockistOrdersController {
  constructor(private readonly orders: StockistOrdersService) {}

  // ---- Stockist ----
  @Roles(Role.STOCKIST)
  @Get('catalog')
  catalog() {
    return this.orders.catalog();
  }

  @Roles(Role.STOCKIST)
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.myOrders(user.id);
  }

  @Roles(Role.STOCKIST)
  @Post()
  place(@CurrentUser() user: AuthUser, @Body() dto: PlaceOrderDto) {
    return this.orders.placeOrder(user.id, dto);
  }

  // ---- Owner / employee ----
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get()
  listAll() {
    return this.orders.listAll();
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Post(':id/decide')
  decide(@Param('id') id: string, @Body() dto: DecideDto) {
    return this.orders.decide(id, dto);
  }
}
