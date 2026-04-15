/**
 * PulseTrader+ Unit Tests
 *
 * Tests the core trading engine logic: quotes, token listing,
 * price calculations, and fee math.
 *
 * Run: npm test
 */
import { describe, it, expect, beforeAll } from "vitest";

// Mock dotenv to prevent .env file not found errors
import dotenv from "dotenv";
dotenv.config({ path: new URL("../../.env", import.meta.url).pathname });

import {
  listTokens,
  getTokenBySymbol,
  getSwapQuote,
  getCurrentPrices,
} from "../onchain";

// ---------------------------------------------------------------------------
// Token Registry
// ---------------------------------------------------------------------------

describe("Token Registry", () => {
  it("listTokens returns at least OKB", () => {
    const tokens = listTokens();
    expect(tokens.length).toBeGreaterThanOrEqual(1);
    const symbols = tokens.map((t) => t.symbol);
    expect(symbols).toContain("OKB");
  });

  it("listTokens returns PUSDC and PWETH when deployed", () => {
    const tokens = listTokens();
    const symbols = tokens.map((t) => t.symbol);
    // These should exist because .env has the addresses
    if (process.env.PUSDC_ADDRESS) {
      expect(symbols).toContain("PUSDC");
    }
    if (process.env.PWETH_ADDRESS) {
      expect(symbols).toContain("PWETH");
    }
  });

  it("getTokenBySymbol returns correct token", () => {
    const okb = getTokenBySymbol("OKB");
    expect(okb).toBeDefined();
    expect(okb!.symbol).toBe("OKB");
    expect(okb!.decimals).toBe(18);
  });

  it("getTokenBySymbol is case-insensitive", () => {
    const okb = getTokenBySymbol("okb");
    expect(okb).toBeDefined();
    expect(okb!.symbol).toBe("OKB");
  });

  it("getTokenBySymbol returns undefined for unknown token", () => {
    const token = getTokenBySymbol("DOESNOTEXIST");
    expect(token).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

describe("Price System", () => {
  it("getCurrentPrices returns an object with OKB, PUSDC, PWETH", () => {
    const prices = getCurrentPrices();
    expect(prices).toHaveProperty("OKB");
    expect(prices).toHaveProperty("PUSDC");
    expect(prices).toHaveProperty("PWETH");
  });

  it("PUSDC price is always 1.0 (stablecoin peg)", () => {
    const prices = getCurrentPrices();
    expect(prices.PUSDC).toBe(1.0);
  });

  it("OKB and PWETH have positive prices", () => {
    const prices = getCurrentPrices();
    expect(prices.OKB).toBeGreaterThan(0);
    expect(prices.PWETH).toBeGreaterThan(0);
  });

  it("getCurrentPrices returns a copy (not the original reference)", () => {
    const p1 = getCurrentPrices();
    const p2 = getCurrentPrices();
    expect(p1).not.toBe(p2); // Different object references
    expect(p1).toEqual(p2); // Same values
  });
});

// ---------------------------------------------------------------------------
// Swap Quotes
// ---------------------------------------------------------------------------

describe("Swap Quote Engine", () => {
  it("getSwapQuote returns correct structure", () => {
    const quote = getSwapQuote("PUSDC", "PWETH", 1000);
    expect(quote).toHaveProperty("amountOut");
    expect(quote).toHaveProperty("fee");
    expect(quote).toHaveProperty("rate");
    expect(quote).toHaveProperty("fromSymbol", "PUSDC");
    expect(quote).toHaveProperty("toSymbol", "PWETH");
    expect(quote).toHaveProperty("amountIn", "1000");
  });

  it("amountOut is positive and less than gross (fee deducted)", () => {
    const quote = getSwapQuote("PUSDC", "PWETH", 2500);
    const amountOut = parseFloat(quote.amountOut);
    expect(amountOut).toBeGreaterThan(0);
    // With 0.1% fee, amountOut should be ~0.999x the gross
    // 2500 PUSDC at $1 / $2500 PWETH = ~1 PWETH gross, minus 0.1% fee
    expect(amountOut).toBeLessThan(1.0);
  });

  it("0.1% fee is correctly applied", () => {
    const prices = getCurrentPrices();
    const amount = 10000;
    const quote = getSwapQuote("PUSDC", "PWETH", amount);

    const rate = prices.PUSDC / prices.PWETH;
    const grossOut = amount * rate;
    const expectedFee = grossOut * 0.001; // 0.1% = 10 bps
    const expectedAmountOut = grossOut - expectedFee;

    expect(parseFloat(quote.fee)).toBeCloseTo(expectedFee, 8);
    expect(parseFloat(quote.amountOut)).toBeCloseTo(expectedAmountOut, 8);
  });

  it("reverse swap preserves fee symmetry", () => {
    const q1 = getSwapQuote("PUSDC", "PWETH", 1000);
    const q2 = getSwapQuote("PWETH", "PUSDC", parseFloat(q1.amountOut));

    // After two swaps with fees, we should get back less than 1000
    const finalAmount = parseFloat(q2.amountOut);
    expect(finalAmount).toBeLessThan(1000);
    // But not drastically less (fees are small)
    expect(finalAmount).toBeGreaterThan(990);
  });

  it("throws for unknown tokens", () => {
    expect(() => getSwapQuote("FAKE", "PWETH", 100)).toThrow();
  });

  it("handles very small amounts", () => {
    const quote = getSwapQuote("PUSDC", "PWETH", 0.01);
    expect(parseFloat(quote.amountOut)).toBeGreaterThan(0);
  });

  it("handles very large amounts", () => {
    const quote = getSwapQuote("PUSDC", "PWETH", 1_000_000);
    expect(parseFloat(quote.amountOut)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe("Edge Cases", () => {
  it("same-token swap should have rate of 1 (minus fees)", () => {
    // OKB to OKB would just be a fee deduction
    // (our engine uses prices, so OKB/OKB = 1.0 rate)
    const quote = getSwapQuote("PUSDC", "PUSDC", 100);
    const out = parseFloat(quote.amountOut);
    expect(out).toBeCloseTo(99.9, 2); // 100 - 0.1% fee = 99.9
  });
});
