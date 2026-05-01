import { describe, expect, it } from 'vitest';
import { compress } from '../src/compression/pipeline';

describe('report contract', () => {
  it('populates report fields for one-way output', () => {
    const result = compress('please note that implementation and documentation should be improved', { mode: 'ultra' });
    expect(Array.isArray(result.report.diffPreview)).toBe(true);
    expect(Array.isArray(result.report.riskEvents)).toBe(true);
    expect(typeof result.metrics.estimatedTokenSavings).toBe('number');
  });
});
