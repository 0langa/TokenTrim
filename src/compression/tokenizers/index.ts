import type { TokenEstimate, TokenizerKind } from '../types';
import { approxGenericEstimate } from './approxGeneric';
import { openaiCompatibleEstimate } from './openaiCompatible';

export function estimateTokens(text: string, tokenizer: TokenizerKind = 'approx-generic'): TokenEstimate {
  if (tokenizer === 'approx-generic') return approxGenericEstimate(text);
  return openaiCompatibleEstimate(text, tokenizer);
}
