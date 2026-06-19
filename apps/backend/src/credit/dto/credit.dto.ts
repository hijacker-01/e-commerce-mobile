import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Owner sets the customer's credit terms (and implicitly activates the account).
export class SetCreditTermsDto {
  @IsNumber()
  @Min(0)
  limit!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tenureDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interestPct?: number;
}

// A ledger movement: positive = debit (charge), negative = credit (repayment).
export class LedgerEntryDto {
  @IsNumber()
  amount!: number;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
