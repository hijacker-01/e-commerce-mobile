import { Controller, Get, Param } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BackupService } from './backup.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('backup')
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  // Any signed-in user can download a complete backup of their own data.
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.backup.exportUser(user.id);
  }

  // Owner/employee can back up any user's data (admin recovery).
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get('user/:id')
  user(@Param('id') id: string) {
    return this.backup.exportUser(id);
  }
}
