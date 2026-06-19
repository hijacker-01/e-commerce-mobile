import { IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  orderId!: string;
}

// Echoed back by Razorpay Checkout on success.
export class VerifyPaymentDto {
  @IsString()
  orderId!: string;

  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;
}
