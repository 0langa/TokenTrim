import { describe, expect, it } from 'vitest';
import { compress, decompress } from '../src/compression/pipeline';

describe('profiles and roundtrip', () => {
  it('validates normalized roundtrip for lossless-light', () => {
    const input = 'Hello   world\r\n\r\n\r\nText';
    const result = compress(input, { profileId: 'lossless-light' });
    expect(result.reversible).toBe(true);
    expect(result.validation.validationKind).toBe('normalized-roundtrip');
    expect(result.validation.passed).toBe(true);
  });

  it('lossy profiles are never marked reversible', () => {
    const result = compress('please note this is important', { profileId: 'lossy-prose' });
    expect(result.reversible).toBe(false);
    expect(result.validation.validationKind).toBe('lossy-no-roundtrip');
  });

  it('roundtrips dictionary mode with legend', () => {
    const input = 'alpha beta gamma alpha beta gamma alpha beta gamma';
    const result = compress(input, { profileId: 'lossless-dict' });
    expect(result.legend).not.toBeNull();
    if (!result.legend) return;
    const restored = decompress(result.output, result.legend);
    expect(restored).toContain('alpha beta gamma');
  });

  it('keeps report contract populated', () => {
    const result = compress('in general the requirements are important', { profileId: 'meeting-notes' });
    expect(Array.isArray(result.report.diffPreview)).toBe(true);
    expect(typeof result.metrics.netCharSavingsIncludingLegend).toBe('number');
    expect(Array.isArray(result.report.riskEvents)).toBe(true);
  });

  it('conservative profiles filter high-risk replacements on requirement semantics', () => {
    const result = compress('the requirement must not change because 10ms threshold applies', { profileId: 'spec' });
    expect(result.report.riskEvents.some((x) => /requirement|must|not|10/i.test(x.before))).toBe(false);
    expect(result.output).toContain('requirement must not');
  });
});
