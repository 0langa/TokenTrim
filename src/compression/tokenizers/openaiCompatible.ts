import type { TokenEstimate, TokenizerKind } from '../types';
import { approxGenericEstimate } from './approxGeneric';
import { exactTokenCount } from './exactTokenizer';

export function openaiCompatibleEstimate(text: string, tokenizer: Exclude<TokenizerKind, 'approx-generic'>): TokenEstimate {
  const exact = exactTokenCount(text);
  if (exact !== null) {
    return { tokenizer, tokens: exact, exact: true };
  }
  const fallback = approxGenericEstimate(text);
  return { tokenizer, tokens: fallback.tokens, exact: false };
}
