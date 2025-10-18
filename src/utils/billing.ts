// src/utils/billing.ts
// Token/cost estimator (+ soft budget guard) for client-side BYOK flows.

// crude but safe token approximation: ~4 chars ≈ 1 token
export function estimateTokensFromText(text: string): number {
  const clean = text.replace(/\s+/g, " ").trim();
  return Math.max(1, Math.ceil(clean.length / 4));
}

// Default prices for gpt-4o-mini (adjust anytime):
// As of mid/late 2024, gpt-4o-mini list was roughly:
// input: $0.15 / 1M tokens, output: $0.60 / 1M tokens
// Which is $0.00015 / 1K input, $0.00060 / 1K output
export type ModelPricing = {
  inputUSDper1K: number;
  outputUSDper1K: number;
};

export const PRICING_4O_MINI: ModelPricing = {
  inputUSDper1K: 0.00015,
  outputUSDper1K: 0.00060,
};

// Estimate cost of a single request
export function estimateUSD(
  tokensIn: number,
  tokensOut: number,
  pricing: ModelPricing = PRICING_4O_MINI
): number {
  const inCost = (tokensIn / 1000) * pricing.inputUSDper1K;
  const outCost = (tokensOut / 1000) * pricing.outputUSDper1K;
  return +(inCost + outCost).toFixed(6);
}

// ---- BYOK soft budget helpers (localStorage) ----
const LS_KEY_BUDGET_USD = "aiBudgetUsd";
const LS_KEY_SPENT_USD = "aiSpentUsd";

export function getBudgetUSD(): number {
  const v = localStorage.getItem(LS_KEY_BUDGET_USD);
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function setBudgetUSD(v: number): void {
  localStorage.setItem(LS_KEY_BUDGET_USD, String(Math.max(0, v)));
}

export function getSpentUSD(): number {
  const v = localStorage.getItem(LS_KEY_SPENT_USD);
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function addSpentUSD(delta: number): void {
  const next = Math.max(0, getSpentUSD() + Math.max(0, delta));
  localStorage.setItem(LS_KEY_SPENT_USD, String(+next.toFixed(6)));
}

export function resetSpent(): void {
  localStorage.setItem(LS_KEY_SPENT_USD, "0");
}
