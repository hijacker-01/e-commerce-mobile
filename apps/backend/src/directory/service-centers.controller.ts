import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ServiceCentersService } from './service-centers.service';
import { CreateServiceCenterDto } from './dto/service-center.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('service-centers')
export class ServiceCentersController {
  constructor(private readonly centers: ServiceCentersService) {}

  @Public()
  @Get()
  search(@Query('brand') brand?: string, @Query('q') q?: string) {
    return this.centers.search(brand, q);
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Post()
  create(@Body() dto: CreateServiceCenterDto) {
    return this.centers.create(dto);
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.centers.remove(id);
  }
}
