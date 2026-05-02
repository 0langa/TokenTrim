import { describe, it, expect } from 'vitest';
import { logCompressionTransform } from './logCompressionTransform';

describe('log compression', () => {
  it('groups repeated lines', () => {
    const input = '2026-01-01 00:00:00Z TimeoutError\n2026-01-01 00:00:01Z TimeoutError\nOK';
    const out = logCompressionTransform(input);
    expect(out.output).toContain('[repeated 2x]');
    expect(out.output).toContain('OK');
  });

  it('declares allowedSafetyCategories for date-loss and number-loss', () => {
    const out = logCompressionTransform('2026-01-01T00:00:00Z ERROR foo\n2026-01-01T00:00:01Z ERROR foo');
    expect(out.allowedSafetyCategories).toContain('date-loss');
    expect(out.allowedSafetyCategories).toContain('number-loss');
  });

  it('preserves unique error messages after grouping', () => {
    const input = [
      '2026-01-01T00:00:00Z ERROR TimeoutError at service/auth',
      '2026-01-01T00:00:01Z ERROR TimeoutError at service/auth',
      '2026-01-01T00:00:02Z WARN slow connection',
    ].join('\n');
    const out = logCompressionTransform(input);
    expect(out.output).toContain('TimeoutError');
    expect(out.output).toContain('WARN slow connection');
  });
});
