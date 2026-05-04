import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from './shareableUrl';
import type { ShareableState } from './shareableUrl';

describe('shareableUrl', () => {
  it('round-trips a complete state', () => {
    const state: ShareableState = {
      mode: 'heavy',
      profile: 'agent-context',
      maxRisk: 'low',
      tokenizer: 'openai-cl100k',
      targetTokens: '4096',
      allowUnsafeTransforms: true,
      input: 'Hello world',
      customTransforms: ['filler-removal', 'numeric'],
    };
    const encoded = encodeState(state);
    const decoded = decodeState('?' + encoded);
    expect(decoded).toMatchObject(state);
  });

  it('round-trips unicode input', () => {
    const state: ShareableState = {
      mode: 'normal',
      input: '日本語テキスト 🚀 émojis',
    };
    const encoded = encodeState(state);
    const decoded = decodeState('?' + encoded);
    expect(decoded?.input).toBe(state.input);
  });

  it('skips input when over size limit', () => {
    const state: ShareableState = {
      mode: 'ultra',
      input: 'x'.repeat(5000),
    };
    const encoded = encodeState(state);
    const decoded = decodeState('?' + encoded);
    expect(decoded?.mode).toBe('ultra');
    expect(decoded?.input).toBeUndefined();
  });

  it('ignores invalid enum values', () => {
    const decoded = decodeState('?m=invalid&p=nope&r=bad&t=unknown');
    expect(decoded).toEqual({ allowUnsafeTransforms: false });
  });

  it('returns null for empty query', () => {
    expect(decodeState('')).toBeNull();
    expect(decodeState('?')).toBeNull();
    expect(decodeState('?foo=bar')).toBeNull();
  });

  it('omits optional fields when undefined', () => {
    const encoded = encodeState({ mode: 'light' });
    const decoded = decodeState('?' + encoded);
    expect(decoded).toEqual({ mode: 'light', allowUnsafeTransforms: false });
  });
});
