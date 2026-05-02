import type { TokenEstimate, TokenizerKind } from '../types';
import { approxGenericEstimate } from './approxGeneric';

export function openaiCompatibleEstimate(text: string, tokenizer: Exclude<TokenizerKind, 'approx-generic'>): TokenEstimate {
  // Optional exact adapter placeholder. Falls back deterministically.
  const fallback = approxGenericEstimate(text);
  return { tokenizer, tokens: fallback.tokens, exact: false };
}
