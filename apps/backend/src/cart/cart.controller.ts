import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

// Cart is a customer feature.
@Roles(Role.CUSTOMER)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.cart.get(user.id);
  }

  @Post('items')
  add(@CurrentUser() user: AuthUser, @Body() dto: AddToCartDto) {
    return this.cart.add(user.id, dto.productId, dto.quantity);
  }

  @Patch('items/:productId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(user.id, productId, dto.quantity);
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser) {
    return this.cart.clear(user.id);
  }
}
