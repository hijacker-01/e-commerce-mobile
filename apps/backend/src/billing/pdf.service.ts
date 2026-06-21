import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PdfService {
  constructor(private readonly prisma: PrismaService) {}

  /** Render a GST tax invoice PDF (fix bill + GST claim document). */
  async invoice(invoiceId: string): Promise<{ buffer: Buffer; number: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: { include: { items: { include: { product: true } } } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const done = collect(doc);

    doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .text(`Invoice No: ${invoice.number}`)
      .text(`Date: ${invoice.createdAt.toISOString().slice(0, 10)}`)
      .text(`Seller GSTIN: ${invoice.sellerGstin ?? '—'}`)
      .text(`Buyer GSTIN: ${invoice.buyerGstin ?? '—'}`);
    doc.moveDown();

    // Table header
    const top = doc.y;
    doc.fontSize(10).text('Item', 50, top);
    doc.text('Qty', 300, top);
    doc.text('Rate', 360, top);
    doc.text('Amount', 450, top);
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.moveDown(0.5);

    for (const item of invoice.order.items) {
      const y = doc.y;
      const amount = item.unitPrice.mul(item.quantity);
      doc.text(item.product.title.slice(0, 40), 50, y, { width: 240 });
      doc.text(String(item.quantity), 300, y);
      doc.text(item.unitPrice.toString(), 360, y);
      doc.text(amount.toString(), 450, y);
      doc.moveDown(0.5);
    }

    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.moveDown(0.5);
    const right = (label: string, val: string) =>
      doc.text(`${label}: ₹${val}`, 300, doc.y, { width: 245, align: 'right' });
    if (Number(invoice.cgst) > 0) right('CGST', invoice.cgst.toString());
    if (Number(invoice.sgst) > 0) right('SGST', invoice.sgst.toString());
    if (Number(invoice.igst) > 0) right('IGST', invoice.igst.toString());
    doc.fontSize(12);
    right('Total', invoice.total.toString());

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#666').text(
      'This is a computer-generated invoice valid for GST input-credit claims.',
      { align: 'center' },
    );

    doc.end();
    return { buffer: await done, number: invoice.number };
  }

  /** Render a warranty card PDF tied to the invoice / device serial. */
  async warranty(invoiceId: string): Promise<{ buffer: Buffer; number: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { warrantyCard: true },
    });
    if (!invoice || !invoice.warrantyCard) {
      throw new NotFoundException('Warranty card not found');
    }
    const w = invoice.warrantyCard;
    const end = new Date(w.startDate);
    end.setMonth(end.getMonth() + w.months);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const done = collect(doc);
    doc.fontSize(20).text('WARRANTY CARD', { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Invoice: ${invoice.number}`)
      .text(`Brand: ${w.brand}`)
      .text(`Model: ${w.model}`)
      .text(`Serial / IMEI: ${w.serialOrImei ?? '—'}`)
      .text(`Warranty: ${w.months} months`)
      .text(`Valid: ${w.startDate.toISOString().slice(0, 10)} to ${end
        .toISOString()
        .slice(0, 10)}`);
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#666').text(
      'Retain this card. Warranty subject to manufacturer terms.',
      { align: 'center' },
    );
    doc.end();
    return { buffer: await done, number: invoice.number };
  }
}

function collect(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
}
