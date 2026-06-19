import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ArrayUnique, IsArray, IsString } from 'class-validator';
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

  // Only OWNER may change an employee's granular permissions.
  @Roles(Role.OWNER)
  @Put(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto) {
    return this.users.setPermissions(id, dto.permissions);
  }
}
