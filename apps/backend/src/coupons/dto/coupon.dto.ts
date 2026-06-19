import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { CouponType } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @IsNumber()
  @IsPositive()
  value!: number;

  @IsOptional()
  @IsNumber()
  minOrder?: number;

  @IsOptional()
  @IsInt()
  usageLimit?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class ApplyCouponDto {
  @IsString()
  orderId!: string;

  @IsString()
  code!: string;
}
