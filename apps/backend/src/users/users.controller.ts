import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

class SetPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions!: string[];
}

class CreateStaffDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(['EMPLOYEE', 'STOCKIST'])
  role!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsString()
  gstin?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.findById(user.id);
  }

  @Roles(Role.OWNER)
  @Get()
  list() {
    return this.users.list();
  }

  // ---- Staff management (owner only) ----
  @Roles(Role.OWNER)
  @Get('staff')
  staff() {
    return this.users.listStaff();
  }

  @Roles(Role.OWNER)
  @Post('staff')
  createStaff(@Body() dto: CreateStaffDto) {
    return this.users.createStaff(dto);
  }

  @Roles(Role.OWNER)
  @Delete('staff/:id')
  removeStaff(@Param('id') id: string) {
    return this.users.removeStaff(id);
  }

  // Only OWNER may change an employee's granular permissions.
  @Roles(Role.OWNER)
  @Put(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto) {
    return this.users.setPermissions(id, dto.permissions);
  }
}
