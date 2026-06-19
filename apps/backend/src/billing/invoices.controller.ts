import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  // Owner, or employee with 'invoice.create', can issue invoices.
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @RequirePermissions('invoice.create')
  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoices.createFromOrder(dto);
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get('gst-report')
  gstReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.invoices.gstReport(from, to);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoices.findOne(id);
  }
}
