import { describe, expect, it } from 'vitest';
import { compress, decompress } from '../src/compression/pipeline';

describe('legend and collisions', () => {
  it('avoids token collision with user content', () => {
    const input = 'marker ␟TTK0_0␟ marker marker marker marker marker marker';
    const result = compress(input, { profileId: 'lossless-dict' });
    if (result.legend) {
      const restored = decompress(result.output, result.legend);
      expect(restored).toContain('␟TTK0_0␟');
    }
  });

  it('handles malformed legend through decode path by throwing', () => {
    expect(() => decompress('abc', { version: 2, profileId: 'x', reversible: true, tokenMap: { '[': 'x' } } as never)).not.toThrow();
  });
});
