import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { OffersService } from './offers.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

class CreateOfferDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

@Controller('offers')
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  @Public()
  @Get()
  active() {
    return this.offers.listActive();
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get('all')
  all() {
    return this.offers.listAll();
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Post()
  create(@Body() dto: CreateOfferDto) {
    return this.offers.create(dto);
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.offers.remove(id);
  }
}
