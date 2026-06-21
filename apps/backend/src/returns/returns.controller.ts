import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { ReturnsService } from './returns.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

class RequestReturnDto {
  @IsString()
  orderId!: string;

  @IsString()
  reason!: string;
}

class DecideReturnDto {
  @IsIn(['approve', 'reject', 'complete'])
  decision!: 'approve' | 'reject' | 'complete';
}

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Roles(Role.CUSTOMER)
  @Post()
  request(@CurrentUser() user: AuthUser, @Body() dto: RequestReturnDto) {
    return this.returns.request(user.id, dto.orderId, dto.reason);
  }

  @Roles(Role.CUSTOMER)
  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.returns.listMine(user.id);
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get()
  all() {
    return this.returns.listAll();
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Patch(':id')
  decide(@Param('id') id: string, @Body() dto: DecideReturnDto) {
    return this.returns.decide(id, dto.decision);
  }
}
