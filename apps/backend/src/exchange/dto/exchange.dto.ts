import {
  IsArray,
  IsNumber,
  IsObject,
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
  @IsString()
  imei?: string;

  @IsOptional()
  @IsString()
  details?: string; // variant + answers to the condition questions

  // Structured condition answers (age, screen, battery, …) used to compute
  // the deterministic buyback value.
  @IsOptional()
  @IsObject()
  answers?: Record<string, string>;

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
