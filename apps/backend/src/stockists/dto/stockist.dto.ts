import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateStockistDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  // Optionally link to a STOCKIST-role user account.
  @IsOptional()
  @IsString()
  userId?: string;
}

class ChallanItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  name!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  rate!: number;
}

export class CreateChallanDto {
  @IsString()
  stockistId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChallanItemDto)
  items!: ChallanItemDto[];
}
