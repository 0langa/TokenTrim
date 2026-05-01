import type { TokenEstimate, TokenizerKind } from './types';

export function estimateTokens(text: string, tokenizer: TokenizerKind = 'approx-generic'): TokenEstimate {
  // Generic approximation: ~4 chars/token for mixed English+code contexts.
  const estimatedTokens = text.length === 0 ? 0 : Math.ceil(text.length / 4);
  return {
    tokenizer,
    estimatedTokens,
    exact: false,
  };
}
