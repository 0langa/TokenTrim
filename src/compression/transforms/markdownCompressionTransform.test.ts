import { describe, it, expect } from 'vitest';
import { markdownCompressionTransform } from './markdownCompressionTransform';

describe('markdown cleanup', () => {
  it('keeps code fences and paragraph breaks', () => {
    const input = '# H\n\nText\n\n```ts\nconst x = 1\n```\n\n- a\n- b';
    const out = markdownCompressionTransform(input);
    expect(out.output).toContain('```ts');
    expect(out.output).toContain('\n\n- a');
  });
});
