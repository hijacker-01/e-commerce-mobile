import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InvoiceType } from '@prisma/client';

export class CreateInvoiceDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsEnum(InvoiceType)
  type?: InvoiceType;

  // Buyer GSTIN enables B2B input-credit claim and inter-state IGST handling.
  @IsOptional()
  @IsString()
  buyerGstin?: string;

  // Warranty card details (optional; defaults to 12 months).
  @IsOptional()
  @IsString()
  serialOrImei?: string;
}
