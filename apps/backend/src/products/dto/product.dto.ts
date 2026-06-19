import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ProductCondition } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  shopId!: string;

  @IsString()
  categoryId!: string;

  @IsString()
  brand!: string;

  @IsString()
  model!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Electronics facets: { processor, ram, storage, batteryMah, audioCodec,
  // anc, btVersion, warrantyMonths, ... } — consumed by smart filters.
  @IsOptional()
  @IsObject()
  specs?: Record<string, unknown>;

  @IsNumber()
  @IsPositive()
  price!: number;

  @IsOptional()
  @IsNumber()
  mrp?: number;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsNumber()
  gstRate?: number;

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  // YouTube / Instagram video links the owner pastes.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoLinks?: string[];
}

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}
