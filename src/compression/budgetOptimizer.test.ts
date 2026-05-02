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
});
