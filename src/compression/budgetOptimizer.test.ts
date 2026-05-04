import { describe, it, expect } from 'vitest';
import { optimizeToBudget } from './budgetOptimizer';

describe('budget optimizer', () => {
  it('reaches target when possible', () => {
    const input = 'Please note that this is very very verbose and we should reduce this text quickly.';
    const out = optimizeToBudget(input, { targetTokens: 5, maxRisk: 'high' });
    expect(out.targetTokens).toBe(5);
    expect(typeof out.budgetReached).toBe('boolean');
  });

  it('warns when target not reached', () => {
    const input = 'short';
    const out = optimizeToBudget(input, { targetTokens: 1, maxRisk: 'safe' });
    if (!out.budgetReached) {
      expect(out.warnings.join(' ')).toContain('Target token budget');
    }
  });

  it('short-circuits to light when already under budget', () => {
    const input = 'Hello world, this is a test sentence for compression analysis.';
    const out = optimizeToBudget(input, { targetTokens: 10_000, maxRisk: 'high' });
    expect(out.budgetReached).toBe(true);
    expect(out.mode).toBe('light');
  });

  it('uses aggressive order for highly compressible text', () => {
    const input = Array(20).fill('This is a repeated paragraph that contains many filler words such as the and a and an.').join('\n\n');
    const out = optimizeToBudget(input, { targetTokens: 20, maxRisk: 'high' });
    expect(out.budgetReached).toBe(true);
  });

  it('uses conservative order for dense text', () => {
    const input = 'function add(a,b){return a+b;}';
    const out = optimizeToBudget(input, { targetTokens: 1, maxRisk: 'safe' });
    expect(out.budgetReached).toBe(false);
    expect(out.warnings.some((w) => w.includes('Target token budget'))).toBe(true);
  });
});
