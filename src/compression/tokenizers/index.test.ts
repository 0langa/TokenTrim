import { describe, it, expect } from 'vitest';
import { estimateTokens } from './index';

describe('tokenizer adapters', () => {
  it('uses approx fallback always', () => {
    const r = estimateTokens('hello world', 'approx-generic');
    expect(r.tokens).toBeGreaterThan(0);
    expect(r.exact).toBe(false);
  });

  it('falls back for openai tokenizer kinds', () => {
    const a = estimateTokens('abc def ghi', 'openai-cl100k');
    const b = estimateTokens('abc def ghi', 'openai-o200k');
    expect(a.exact).toBe(false);
    expect(b.exact).toBe(false);
    expect(a.tokens).toBeGreaterThan(0);
  });

  it('all tokenizer kinds report exact=false until exact adapters are available', () => {
    const kinds = ['approx-generic', 'openai-cl100k', 'openai-o200k'] as const;
    for (const kind of kinds) {
      const r = estimateTokens('test text with multiple words', kind);
      expect(r.exact).toBe(false);
      expect(r.tokenizer).toBe(kind);
      expect(r.tokens).toBeGreaterThan(0);
    }
  });
});
