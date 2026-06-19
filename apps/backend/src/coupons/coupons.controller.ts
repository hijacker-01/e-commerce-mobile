import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, ApplyCouponDto } from './dto/coupon.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  // Owner, or employee with 'coupon.create', issues coupons.
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @RequirePermissions('coupon.create')
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @Public()
  @Get()
  list() {
    return this.coupons.listActive();
  }

  @Roles(Role.CUSTOMER)
  @Post('apply')
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyCouponDto) {
    return this.coupons.applyToOrder(dto.orderId, dto.code, user);
  }
}
