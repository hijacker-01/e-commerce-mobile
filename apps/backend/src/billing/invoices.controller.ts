import { Controller, Get, Param, Post, Query, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly pdf: PdfService,
  ) {}

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

  // Downloadable GST invoice PDF (fix bill / GST claim document).
  @Get(':id/pdf')
  async invoicePdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, number } = await this.pdf.invoice(id);
    sendPdf(res, buffer, `${number}.pdf`);
  }

  // Downloadable warranty card PDF.
  @Get(':id/warranty.pdf')
  async warrantyPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, number } = await this.pdf.warranty(id);
    sendPdf(res, buffer, `${number}-warranty.pdf`);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoices.findOne(id);
  }
}

function sendPdf(res: Response, buffer: Buffer, filename: string) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Content-Length': buffer.length.toString(),
  });
  res.end(buffer);
}
