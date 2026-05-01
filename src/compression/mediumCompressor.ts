import { lightCompress } from './lightCompressor';

const TOKEN_CHARS = '!@#$%^&*~`|<>';
const MIN_PHRASE_LENGTH = 12;
const MIN_OCCURRENCES = 3;
const MIN_OCCURRENCES_LONG = 2;   // for phrases >= 30 chars
const LONG_PHRASE_LENGTH = 30;
const MAX_NGRAM = 8;

function buildTokenChar(index: number): string {
  const base = TOKEN_CHARS.length;
  const outer = Math.floor(index / base);
  const inner = index % base;
  const prefix = outer < TOKEN_CHARS.length ? TOKEN_CHARS[outer] : `Z${outer}`;
  return `${prefix}${inner}`;
}

export interface DictionaryResult {
  text: string;
  legend: Record<string, string>;
}

function extractPhrases(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const words = text.split(/\s+/);
  for (let n = 2; n <= MAX_NGRAM; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      if (phrase.length >= MIN_PHRASE_LENGTH) {
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export function mediumCompress(raw: string): DictionaryResult {
  let text = lightCompress(raw);
  const legend: Record<string, string> = {};

  const counts = extractPhrases(text);

  const candidates = [...counts.entries()]
    .filter(([phrase, count]) =>
      count >= MIN_OCCURRENCES ||
      (count >= MIN_OCCURRENCES_LONG && phrase.length >= LONG_PHRASE_LENGTH)
    )
    .sort(([phraseA, countA], [phraseB, countB]) =>
      (countB * (phraseB.length - 2)) - (countA * (phraseA.length - 2))
    );

  let tokenIndex = 0;
  for (const [phrase] of candidates) {
    if (!text.includes(phrase)) continue;
    const token = buildTokenChar(tokenIndex++);
    legend[token] = phrase;
    text = text.split(phrase).join(token);
  }

  return { text, legend };
}

export function mediumDecompress(text: string, legend: Record<string, string>): string {
  const entries = Object.entries(legend).sort((a, b) => b[0].length - a[0].length);
  let result = text;
  for (const [token, phrase] of entries) {
    result = result.split(token).join(phrase);
  }
  return result;
}
