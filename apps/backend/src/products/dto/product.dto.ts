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
import { Type } from 'class-transformer';
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

  // Electronics spec facets (matched against the product's specs JSON).
  @IsOptional()
  @IsString()
  processor?: string;

  @IsOptional()
  @IsString()
  ram?: string;

  @IsOptional()
  @IsString()
  storage?: string;

  @IsOptional()
  @IsString()
  camera?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  // price_asc | price_desc | newest (default)
  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}
