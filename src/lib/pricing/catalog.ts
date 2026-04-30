// Cost per 1k tokens. Values are best effort defaults and editable in the UI later.
export interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
}

export const PRICING_CATALOG: Record<string, ModelPricing> = {
  'gpt-4o': { inputPer1k: 0.005, outputPer1k: 0.015 },
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'llama-3.1-70b-instruct': { inputPer1k: 0.0009, outputPer1k: 0.0009 },
  'llama-3.1-8b-instruct': { inputPer1k: 0.0002, outputPer1k: 0.0002 },
  'mixtral-8x7b': { inputPer1k: 0.0006, outputPer1k: 0.0006 },
};

export function estimateCost(
  modelName: string,
  promptTokens: number | undefined,
  completionTokens: number | undefined,
): number | null {
  const key = Object.keys(PRICING_CATALOG).find((k) => modelName.toLowerCase().includes(k));
  if (!key) return null;
  const price = PRICING_CATALOG[key];
  const inTok = promptTokens ?? 0;
  const outTok = completionTokens ?? 0;
  return (inTok / 1000) * price.inputPer1k + (outTok / 1000) * price.outputPer1k;
}
