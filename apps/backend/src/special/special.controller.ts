import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsNumber, IsPositive, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { SpecialService } from './special.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

class AddSpecialDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @IsPositive()
  specialPrice!: number;
}

@Controller('special')
export class SpecialController {
  constructor(private readonly special: SpecialService) {}

  @Public()
  @Get()
  list() {
    return this.special.list();
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Post()
  add(@Body() dto: AddSpecialDto) {
    return this.special.upsert(dto.productId, dto.specialPrice);
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Delete(':productId')
  remove(@Param('productId') productId: string) {
    return this.special.remove(productId);
  }
}
