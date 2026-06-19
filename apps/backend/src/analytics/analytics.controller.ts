import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles(Role.OWNER, Role.EMPLOYEE)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary() {
    return this.analytics.summary();
  }
}
