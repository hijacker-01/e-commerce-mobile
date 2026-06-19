import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SubmitExchangeDto {
  @IsString()
  brand!: string;

  @IsString()
  model!: string;

  @IsString()
  condition!: string; // e.g. "good", "fair", "like new"

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class ReviewExchangeDto {
  // true => approve with approvedValue, false => reject
  @IsOptional()
  @IsNumber()
  approvedValue?: number;

  @IsOptional()
  @IsString()
  decision?: 'approve' | 'reject';
}
