import { describe, it, expect } from 'vitest';
import { compress } from './pipeline';
import type { CompressionMode } from './types';

const SAMPLE = `The system should be able to process requests very quickly.
It is important that we implement a solution for the problem.
There are many ways to approach this issue, and we need to find the best one.
You should consider using a cache to improve performance.
The database connection pool will help with scalability.`;

const MODES: CompressionMode[] = ['light', 'normal', 'heavy', 'ultra'];

describe('compress — smoke tests', () => {
  for (const mode of MODES) {
    it(`mode=${mode} returns string output without throwing`, () => {
      const result = compress(SAMPLE, { mode });
      expect(typeof result.output).toBe('string');
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.mode).toBe(mode);
    });

    it(`mode=${mode} metrics are non-negative`, () => {
      const result = compress(SAMPLE, { mode });
      expect(result.metrics.originalChars).toBeGreaterThan(0);
      expect(result.metrics.outputChars).toBeGreaterThan(0);
      expect(result.metrics.estimatedTokensBefore).toBeGreaterThan(0);
      expect(result.metrics.estimatedTokenSavings).toBeGreaterThanOrEqual(0);
    });
  }

  it('light mode preserves more content than ultra', () => {
    const light = compress(SAMPLE, { mode: 'light' });
    const ultra = compress(SAMPLE, { mode: 'ultra' });
    expect(light.metrics.outputChars).toBeGreaterThan(ultra.metrics.outputChars);
  });

  it('output chars <= original chars for all modes', () => {
    for (const mode of MODES) {
      const result = compress(SAMPLE, { mode });
      expect(result.metrics.outputChars).toBeLessThanOrEqual(result.metrics.originalChars);
    }
  });

  it('report has expected shape', () => {
    const result = compress(SAMPLE, { mode: 'normal' });
    expect(Array.isArray(result.report.transformStats)).toBe(true);
    expect(Array.isArray(result.report.removedPhrases)).toBe(true);
    expect(Array.isArray(result.report.replacedPhrases)).toBe(true);
    expect(Array.isArray(result.report.riskEvents)).toBe(true);
    expect(Array.isArray(result.report.diffPreview)).toBe(true);
  });

  it('handles empty string without throwing', () => {
    const result = compress('', { mode: 'normal' });
    expect(result.output).toBe('');
    expect(result.metrics.charSavings).toBe(0);
  });

  it('JSON input is minified in all modes', () => {
    const json = '{\n  "name": "Alice",\n  "age": 30,\n  "active": true\n}';
    for (const mode of MODES) {
      const result = compress(json, { mode });
      expect(result.output).not.toContain('\n  ');
    }
  });

  it('fenced code blocks survive unchanged', () => {
    const input = 'Some prose.\n\n```typescript\nconst x = a && b;\n```\n\nMore prose.';
    for (const mode of MODES) {
      const result = compress(input, { mode });
      expect(result.output).toContain('const x = a && b;');
    }
  });

  it('URLs survive unchanged', () => {
    const input = 'Visit https://example.com/path?q=1&r=2 for details.';
    for (const mode of MODES) {
      const result = compress(input, { mode });
      expect(result.output).toContain('https://example.com/path?q=1&r=2');
    }
  });

  it('warnings array is always present', () => {
    const result = compress(SAMPLE, { mode: 'ultra' });
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
