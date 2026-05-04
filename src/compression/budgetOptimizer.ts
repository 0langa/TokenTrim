import type { CompressionMode, CompressionOptions, CompressionResult } from './types';
import { compress } from './pipeline';
import { estimateTokens } from './tokenizer';

function estimateCompressibility(input: string): number {
  const words = input.match(/\b\w+\b/g) ?? [];
  if (words.length === 0) return 0;

  const lines = input.split('\n');
  const markdownLines = lines.filter((l) => /^[#*>:-]/.test(l)).length;
  const markdownRatio = markdownLines / (lines.length || 1);

  const paragraphs = input.split(/\n{2,}/);
  const uniqueParagraphs = new Set(paragraphs.map((p) => p.trim()));
  const repeatRatio = 1 - uniqueParagraphs.size / (paragraphs.length || 1);

  const fillerWords = ['the', 'a', 'an', 'that', 'which', 'very', 'really', 'quite', 'just', 'basically', 'actually', 'simply'];
  const fillerCount = words.filter((w) => fillerWords.includes(w.toLowerCase())).length;
  const fillerRatio = fillerCount / words.length;

  let estimate = 0.15;
  estimate += markdownRatio * 0.1;
  estimate += repeatRatio * 0.2;
  estimate += fillerRatio * 0.15;

  const codeBlockRatio = (input.match(/```/g)?.length ?? 0) / (lines.length || 1);
  estimate -= codeBlockRatio * 0.1;

  return Math.min(0.6, Math.max(0.05, estimate));
}

function chooseOrder(mode: CompressionMode | undefined, targetRatio: number, compressibility: number): CompressionMode[] {
  if (mode === 'custom') return ['custom'];
  if (compressibility > 0.4 || targetRatio < 0.4) {
    return ['heavy', 'ultra', 'normal', 'light'];
  }
  if (compressibility < 0.2 || targetRatio > 0.8) {
    return ['light', 'normal', 'heavy', 'ultra'];
  }
  return ['normal', 'heavy', 'light', 'ultra'];
}

export function optimizeToBudget(input: string, options: CompressionOptions): CompressionResult {
  if (!options.targetTokens || options.targetTokens <= 0) {
    return compress(input, options);
  }

  const tokenBefore = estimateTokens(input, options.tokenizer ?? 'approx-generic').tokens;
  if (tokenBefore <= options.targetTokens) {
    const result = compress(input, { ...options, mode: 'light' });
    return { ...result, targetTokens: options.targetTokens, budgetReached: true };
  }

  const compressibility = estimateCompressibility(input);
  const targetRatio = options.targetTokens / tokenBefore;
  const order = chooseOrder(options.mode, targetRatio, compressibility);

  let best: CompressionResult | null = null;
  for (const mode of order) {
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
