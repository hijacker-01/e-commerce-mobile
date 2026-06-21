import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

export class CompareDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  productIds!: string[];
}

export class RecommendDto {
  // Free-text need, e.g. "under 30k, great battery, good for music".
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class DraftListingDto {
  @IsString()
  brand!: string;

  @IsString()
  model!: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class SupportDto {
  @IsString()
  question!: string;
}
