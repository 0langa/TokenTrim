import type { TokenEstimate } from '../types';

export function approxGenericEstimate(text: string): TokenEstimate {
  const tokens = text.length === 0 ? 0 : Math.ceil(text.length / 4);
  return { tokenizer: 'approx-generic', tokens, exact: false };
}
