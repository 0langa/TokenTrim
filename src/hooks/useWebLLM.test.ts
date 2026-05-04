import { describe, expect, it } from 'vitest';
import { estimateTokens } from '../compression/tokenizers/index';
import { createCompressionPlan, splitTextForLlm } from './useWebLLM';

describe('useWebLLM planning helpers', () => {
  it('keeps short input in a single pass', () => {
    const input = 'Keep 42, path src/App.tsx, and requirement must remain.';
    const prompt = 'Compress while preserving facts.';
    const plan = createCompressionPlan(input, prompt, 'SmolLM2-360M-Instruct-q4f16_1-MLC');

    expect(plan.chunked).toBe(false);
    expect(plan.chunks).toEqual([input]);
    expect(plan.maxTokens).toBeGreaterThan(0);
    expect(plan.maxTokens).toBeLessThanOrEqual(640);
  });

  it('splits oversized input into ordered chunks', () => {
    const input = Array.from(
      { length: 220 },
      (_, index) => `Section ${index}: preserve value ${index} and requirement must remain.`,
    ).join('\n\n');

    const chunks = splitTextForLlm(input, 240);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain('Section 0');
    expect(chunks.at(-1)).toContain('Section 219');

    for (const chunk of chunks) {
      expect(chunk.trim().length).toBeGreaterThan(0);
      expect(estimateTokens(chunk, 'approx-generic').tokens).toBeLessThan(420);
    }
  });

  it('uses chunked mode when text exceeds single-pass budget', () => {
    const input = Array.from(
      { length: 260 },
      (_, index) => `Block ${index}: preserve 2026-05-04, v2.1.0, and src/hooks/useWebLLM.ts exactly.`,
    ).join('\n\n');
    const prompt = 'Compress while preserving all facts, numbers, dates, versions, and file paths.';
    const plan = createCompressionPlan(input, prompt, 'Llama-3.2-1B-Instruct-q4f16_1-MLC');

    expect(plan.chunked).toBe(true);
    expect(plan.chunks.length).toBeGreaterThan(1);
    expect(plan.maxTokens).toBe(512);
    expect(plan.estimatedInputTokens).toBeGreaterThan(plan.inputBudgetTokens);
  });
});
