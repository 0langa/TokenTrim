import { describe, it, expect } from 'vitest';
import { logCompressionTransform } from './logCompressionTransform';

describe('log compression', () => {
  it('groups repeated lines', () => {
    const input = '2026-01-01 00:00:00Z TimeoutError\n2026-01-01 00:00:01Z TimeoutError\nOK';
    const out = logCompressionTransform(input);
    expect(out.output).toContain('[repeated 2x]');
    expect(out.output).toContain('OK');
  });
});
