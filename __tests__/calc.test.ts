import { describe, expect, it } from "vitest";

import { profit, totalCost } from "../lib/calc";

describe("totalCost", () => {
  it("sums purchase, fees, and refurb costs", () => {
    const item = {
      purchaseToman: 10_000_000,
      feesToman: 500_000,
      refurbToman: 250_000,
    };

    expect(totalCost(item)).toBe(10_750_000);
  });

  it("treats missing values as zero", () => {
    expect(totalCost({})).toBe(0);
    expect(totalCost({ purchaseToman: 2_000_000 })).toBe(2_000_000);
    expect(totalCost({ feesToman: null, refurbToman: undefined })).toBe(0);
  });
});

describe("profit", () => {
  it("calculates profit when sale price is available", () => {
    const item = {
      purchaseToman: 8_000_000,
      feesToman: 500_000,
      refurbToman: 250_000,
      soldPriceToman: 10_000_000,
    };

    expect(profit(item)).toBe(1_250_000);
  });

  it("returns a negative value when costs exceed sale price", () => {
    const item = {
      purchaseToman: 5_000_000,
      feesToman: 500_000,
      refurbToman: 250_000,
      soldPriceToman: 4_000_000,
    };

    expect(profit(item)).toBe(-1_750_000);
  });

  it("falls back to zero sale value when not provided", () => {
    const item = {
      purchaseToman: 3_000_000,
      feesToman: 200_000,
      refurbToman: 300_000,
    };

    expect(profit(item)).toBe(-3_500_000);
  });
});
