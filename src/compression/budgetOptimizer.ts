import type { CompressionOptions, CompressionResult } from './types';
import { compress } from './pipeline';

const ORDER = ['light', 'normal', 'heavy', 'ultra'] as const;

export function optimizeToBudget(input: string, options: CompressionOptions): CompressionResult {
  if (!options.targetTokens || options.targetTokens <= 0) {
    return compress(input, options);
  }

  let best: CompressionResult | null = null;
  for (const mode of ORDER) {
    const result = compress(input, { ...options, mode });
    if (!best || result.metrics.estimatedTokensAfter < best.metrics.estimatedTokensAfter) {
      best = result;
    }
    if (result.metrics.estimatedTokensAfter <= options.targetTokens) {
      return { ...result, targetTokens: options.targetTokens, budgetReached: true };
    }
  }

  return {
    ...(best ?? compress(input, options)),
    targetTokens: options.targetTokens,
    budgetReached: false,
    warnings: [...(best?.warnings ?? []), `Target token budget ${options.targetTokens} not reached.`],
  };
}
