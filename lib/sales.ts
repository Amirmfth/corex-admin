// lib/sales.ts
import { prisma } from "./prisma";

/**
 * IMPORTANT: Field names across installations vary a bit.
 * This file assumes your schema has:
 *   - model Sale        { id, customerName (string), reference (string|null), createdAt DateTime, lines SaleLine[] }
 *   - model SaleLine    { id, saleId, quantity Int, fulfilledQty Int? (or soldItemIds String[]?), ... }
 *
 * If your Sale has a relation to Customer instead of a `customerName` column,
 * change the projection below to read `sale.customer.name`. (Comments included.)
 */

/** The exact shape your Sales list page expects */
export type SalesListEntry = {
  id: string;
  customerName: string;      // display name for list
  reference: string | null;
  totalItems: number;
  fulfilledItems: number;    // shipped/sold/fulfilled so far
  createdAt: Date;
};

/**
 * Returns latest Sales with totals & fulfillment counts.
 * Mirrors lib/purchases.getPurchasesList() behavior.  */
export async function getSalesList(limit = 20): Promise<SalesListEntry[]> {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      lines: true,

      // If your schema uses a Customer relation and NOT a customerName field,
      // uncomment this block and read from sale.customer?.name below:
      // customer: { select: { name: true } },
    },
  });

  return sales.map((sale) => {
    // Sum the requested quantities
    const totals = sale.lines.reduce(
      (acc, line) => {
        acc.totalItems += safeQty(line);

        // Fulfilled logic: support multiple schema styles safely
        // 1) fulfilledQty number column
        // 2) soldItemIds string[] column (or deliveredItemIds, shippedItemIds, etc.)
        const fulfilledFromNumber = (line as any).fulfilledQty as number | undefined;
        const soldArrayLen =
          ((line as any).soldItemIds as string[] | undefined)?.length ??
          ((line as any).deliveredItemIds as string[] | undefined)?.length ??
          ((line as any).shippedItemIds as string[] | undefined)?.length ??
          0;

        acc.fulfilledItems += fulfilledFromNumber ?? soldArrayLen ?? 0;
        return acc;
      },
      { totalItems: 0, fulfilledItems: 0 },
    );

    return {
      id: sale.id,
      // If you use a relation instead of a column, swap this to:
      // customerName: (sale as any).customer?.name ?? "—",
      customerName: (sale as any).customerName ?? "—",
      reference: (sale as any).reference ?? null,
      totalItems: totals.totalItems,
      fulfilledItems: totals.fulfilledItems,
      createdAt: sale.createdAt,
    };
  });
}

function safeQty(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : 0;
}
