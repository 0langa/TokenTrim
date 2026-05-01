import { mediumCompress } from './mediumCompressor';

const WORD_TOKEN_PREFIX = '^';
const MIN_WORD_LENGTH = 8;
const MIN_WORD_OCCURRENCES = 2;

export interface HeavyResult {
  text: string;
  legend: Record<string, string>;
}

function buildWordToken(index: number): string {
  return `${WORD_TOKEN_PREFIX}${index}`;
}

function substituteFrequentWords(text: string, existingLegend: Record<string, string>): { text: string; wordLegend: Record<string, string> } {
  // Collect all tokens already in use to avoid collision
  const usedTokens = new Set(Object.keys(existingLegend));
  // Also collect all phrases already substituted to skip their former words
  const substitutedPhrases = new Set(Object.values(existingLegend));

  // Count word occurrences (whole-word match, preserve case)
  const counts = new Map<string, number>();
  const wordRe = /\b[A-Za-z][A-Za-z0-9_-]{7,}\b/g;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(text)) !== null) {
    const w = m[0];
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }

  // Sort by total char savings: (word.length - token.length) * count
  const candidates = [...counts.entries()]
    .filter(([word, count]) => {
      if (count < MIN_WORD_OCCURRENCES) return false;
      if (word.length < MIN_WORD_LENGTH) return false;
      // Skip if this word is already inside a substituted phrase
      for (const phrase of substitutedPhrases) {
        if (phrase.includes(word)) return false;
      }
      return true;
    })
    .sort(([a, ac], [b, bc]) => (bc * b.length) - (ac * a.length));

  const wordLegend: Record<string, string> = {};
  let idx = 0;
  let result = text;

  for (const [word] of candidates) {
    if (!result.includes(word)) continue;
    let token: string;
    do {
      token = buildWordToken(idx++);
    } while (usedTokens.has(token));
    usedTokens.add(token);
    wordLegend[token] = word;
    // Whole-word replacement only
    result = result.replace(new RegExp(`\\b${word.replace(/[-]/g, '\\-')}\\b`, 'g'), token);
  }

  return { text: result, wordLegend };
}

export function heavyCompress(raw: string): HeavyResult {
  const { text: medText, legend: phraseLegend } = mediumCompress(raw);
  const { text, wordLegend } = substituteFrequentWords(medText, phraseLegend);
  const legend = { ...phraseLegend, ...wordLegend };
  return { text, legend };
}

export function heavyDecompress(text: string, legend: Record<string, string>): string {
  // Restore word tokens first (shorter keys), then phrase tokens
  // Sort: word tokens (^N) last so phrase tokens restore first, avoiding partial matches
  const entries = Object.entries(legend).sort((a, b) => {
    const aIsWord = a[0].startsWith(WORD_TOKEN_PREFIX);
    const bIsWord = b[0].startsWith(WORD_TOKEN_PREFIX);
    if (aIsWord && !bIsWord) return 1;
    if (!aIsWord && bIsWord) return -1;
    return b[0].length - a[0].length;
  });
  let result = text;
  for (const [token, original] of entries) {
    result = result.split(token).join(original);
  }
  return result;
}
