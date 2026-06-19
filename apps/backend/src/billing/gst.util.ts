import { Prisma } from '@prisma/client';

export interface GstLine {
  taxableValue: Prisma.Decimal;
  gstRate: Prisma.Decimal;
}

export interface GstBreakup {
  taxable: Prisma.Decimal;
  cgst: Prisma.Decimal;
  sgst: Prisma.Decimal;
  igst: Prisma.Decimal;
  total: Prisma.Decimal;
  interState: boolean;
}

/** State code = first two digits of a GSTIN (e.g. "27" = Maharashtra). */
export function stateCodeFromGstin(gstin?: string | null): string | null {
  if (!gstin || gstin.length < 2) return null;
  return gstin.slice(0, 2);
}

/**
 * India GST split:
 *  - intra-state (same state)  -> CGST + SGST, each = rate/2
 *  - inter-state (diff state)  -> IGST = full rate
 * B2C buyers (no GSTIN) are treated as intra-state with the seller's state.
 */
export function computeGst(
  lines: GstLine[],
  sellerGstin?: string | null,
  buyerGstin?: string | null,
): GstBreakup {
  const sellerState = stateCodeFromGstin(sellerGstin);
  const buyerState = stateCodeFromGstin(buyerGstin);
  const interState =
    !!sellerState && !!buyerState && sellerState !== buyerState;

  const zero = new Prisma.Decimal(0);
  let taxable = zero;
  let cgst = zero;
  let sgst = zero;
  let igst = zero;

  for (const line of lines) {
    const tax = line.taxableValue.mul(line.gstRate).div(100);
    taxable = taxable.add(line.taxableValue);
    if (interState) {
      igst = igst.add(tax);
    } else {
      const half = tax.div(2);
      cgst = cgst.add(half);
      sgst = sgst.add(half);
    }
  }

  return {
    taxable,
    cgst,
    sgst,
    igst,
    total: taxable.add(cgst).add(sgst).add(igst),
    interState,
  };
}
