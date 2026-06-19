import { IsInt, IsPositive, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(0) // 0 removes the line
  quantity!: number;
}
