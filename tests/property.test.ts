import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { compress } from '../src/compression/pipeline';

const MODES = ['light', 'normal', 'heavy', 'ultra'] as const;

const arbitraryText = fc.string({ minLength: 0, maxLength: 5000 });

function invariantNoCrash(input: string, mode: string) {
  try {
    compress(input, { mode: mode as typeof MODES[number], profile: 'general' });
    return true;
  } catch {
    return false;
  }
}

function invariantUrlsPreserved(input: string) {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = input.match(urlPattern) ?? [];
  if (urls.length === 0) return true;
  const result = compress(input, { mode: 'heavy', profile: 'general', maxRisk: 'high' });
  for (const url of urls) {
    if (!result.output.includes(url)) return false;
  }
  return true;
}

function invariantMetricsConsistent(input: string) {
  const result = compress(input, { mode: 'normal', profile: 'general' });
  const expectedSavings = result.metrics.originalChars - result.metrics.outputChars;
  return result.metrics.charSavings === expectedSavings;
}

describe('property-based invariants', () => {
  it('never crashes on arbitrary input', () => {
    fc.assert(
      fc.property(arbitraryText, fc.constantFrom(...MODES), (input, mode) => {
        expect(invariantNoCrash(input, mode)).toBe(true);
      }),
      { numRuns: 500, verbose: false },
    );
  });

  it('output length is at most input length', () => {
    fc.assert(
      fc.property(arbitraryText, (input) => {
        const result = compress(input, { mode: 'normal', profile: 'general' });
        expect(result.output.length).toBeLessThanOrEqual(input.length);
      }),
      { numRuns: 300, verbose: false },
    );
  });

  it('preserves URLs', () => {
    fc.assert(
      fc.property(arbitraryText, (input) => {
        expect(invariantUrlsPreserved(input)).toBe(true);
      }),
      { numRuns: 300, verbose: false },
    );
  });

  it('metrics are internally consistent', () => {
    fc.assert(
      fc.property(arbitraryText, (input) => {
        expect(invariantMetricsConsistent(input)).toBe(true);
      }),
      { numRuns: 300, verbose: false },
    );
  });
});
