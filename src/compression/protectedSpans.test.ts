import { describe, it, expect } from 'vitest';
import { protectSpans, restoreSpans } from './protectedSpans';
import { ALL_PROTECTED_SPANS } from './modes';

function roundtrip(text: string): string {
  const run = protectSpans(text, ALL_PROTECTED_SPANS);
  return restoreSpans(run.text, run.spans);
}

describe('protectedSpans — roundtrip', () => {
  it('fenced code block survives roundtrip', () => {
    const input = 'Before.\n\n```typescript\nconst x = 1;\nconst y = 2;\n```\n\nAfter.';
    expect(roundtrip(input)).toBe(input);
  });

  it('inline code survives roundtrip', () => {
    const input = 'Use `npm install` to install.';
    expect(roundtrip(input)).toBe(input);
  });

  it('URL survives roundtrip', () => {
    const input = 'See https://example.com/path?foo=bar for details.';
    expect(roundtrip(input)).toBe(input);
  });

  it('email survives roundtrip', () => {
    const input = 'Contact support@example.com for help.';
    expect(roundtrip(input)).toBe(input);
  });

  it('API key placeholder survives roundtrip', () => {
    const input = 'Set key to sk_live_abcdefghijk.';
    expect(roundtrip(input)).toBe(input);
  });

  it('markdown heading survives roundtrip', () => {
    const input = '## Setup Guide\n\nSome text.';
    expect(roundtrip(input)).toBe(input);
  });

  it('multiple spans survive roundtrip', () => {
    const input = [
      '# Title',
      '',
      'Visit https://example.com for `inline code`.',
      '',
      '```js',
      'console.log("hello");',
      '```',
      '',
      'Email: user@domain.org',
    ].join('\n');
    expect(roundtrip(input)).toBe(input);
  });

  it('stats count protected spans correctly', () => {
    const input = 'Use `foo` and `bar` and https://x.com.';
    const run = protectSpans(input, ALL_PROTECTED_SPANS);
    expect(run.stats['inline-code']).toBe(2);
    expect(run.stats['url']).toBe(1);
  });

  it('placeholders do not appear in text after restore', () => {
    const input = 'See `code` and https://a.com and user@b.io.';
    const run = protectSpans(input, ALL_PROTECTED_SPANS);
    const restored = restoreSpans(run.text, run.spans);
    expect(restored).not.toContain('TT_SPAN');
  });

  it('cli-command: bare $VARIABLE not protected', () => {
    const input = 'The cost is $100 or $PRICE each.';
    const run = protectSpans(input, ALL_PROTECTED_SPANS);
    // Should NOT protect $100 or $PRICE as cli commands (no space after $)
    expect(run.stats['cli-command']).toBe(0);
  });

  it('cli-command: $ command with space IS protected', () => {
    const input = '$ npm install\n$ git commit -m "msg"';
    const run = protectSpans(input, ALL_PROTECTED_SPANS);
    expect(run.stats['cli-command']).toBeGreaterThan(0);
  });
});
