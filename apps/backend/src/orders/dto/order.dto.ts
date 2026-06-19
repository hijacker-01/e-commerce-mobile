import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, PaymentMethod } from '@prisma/client';

class OrderItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  // Customer-requested delivery timing (owner/employee approves).
  @IsOptional()
  @IsDateString()
  deliverySlot?: string;

  @IsOptional()
  @IsString()
  deliveryAddr?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
