import fastDiff from 'fast-diff';

export type DiffChunk = { op: 'delete' | 'equal' | 'insert'; text: string };

const SEP = ''; // Unicode private-use separator — won't appear in real text

function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}

const OP_MAP: Record<number, DiffChunk['op']> = {
  [-1]: 'delete',
  [0]: 'equal',
  [1]: 'insert',
};

/**
 * Computes a word-level diff between original and compressed.
 * Falls back to character-level for very large inputs (> 200k chars).
 */
export function computeWordDiff(original: string, compressed: string): DiffChunk[] {
  // Character-level fallback for huge inputs
  if (original.length > 200_000) {
    return fastDiff(original, compressed).map(([op, text]) => ({ op: OP_MAP[op], text }));
  }

  const origTokens = tokenize(original);
  const compTokens = tokenize(compressed);

  const proxyOrig = origTokens.join(SEP);
  const proxyComp = compTokens.join(SEP);

  const raw = fastDiff(proxyOrig, proxyComp);

  const chunks: DiffChunk[] = [];
  for (const [op, text] of raw) {
    // Each chunk's text is a SEP-joined list of tokens — split to recover them
    const tokens = text.split(SEP);
    const joined = tokens.join('');
    if (joined === '') continue;
    const last = chunks[chunks.length - 1];
    if (last && last.op === OP_MAP[op]) {
      last.text += joined;
    } else {
      chunks.push({ op: OP_MAP[op], text: joined });
    }
  }

  return chunks;
}
