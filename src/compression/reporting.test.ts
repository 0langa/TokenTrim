import { describe, it, expect } from 'vitest';
import { compress } from './pipeline';
import { createCompressionReport } from './reporting';

describe('reporting', () => {
  it('serializes report json', () => {
    const result = compress('please note we should reduce text', { mode: 'normal', profile: 'general' });
    const report = createCompressionReport(result);
    const str = JSON.stringify(report);
    expect(str.length).toBeGreaterThan(10);
    expect(report.mode).toBe('normal');
    expect(Array.isArray(report.transforms)).toBe(true);
  });
});
