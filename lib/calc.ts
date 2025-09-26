export type ItemFinancials = {
  purchaseToman?: number | null;
  feesToman?: number | null;
  refurbToman?: number | null;
  soldPriceToman?: number | null;
};

export function totalCost(item: ItemFinancials): number {
  const purchase = item.purchaseToman ?? 0;
  const fees = item.feesToman ?? 0;
  const refurb = item.refurbToman ?? 0;
  return purchase + fees + refurb;
}

export function profit(item: ItemFinancials): number {
  const sale = item.soldPriceToman ?? 0;
  return sale - totalCost(item);
}
