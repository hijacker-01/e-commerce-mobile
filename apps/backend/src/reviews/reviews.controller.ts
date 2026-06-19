import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Roles(Role.CUSTOMER)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, dto);
  }

  @Public()
  @Get('product/:productId')
  list(@Param('productId') productId: string) {
    return this.reviews.listForProduct(productId);
  }

  @Public()
  @Get('product/:productId/summary')
  summary(@Param('productId') productId: string) {
    return this.reviews.summary(productId);
  }
}
