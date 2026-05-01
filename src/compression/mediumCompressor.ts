import { lightCompress } from './lightCompressor';

// Token alphabet: printable ASCII symbols unlikely to appear in text
const TOKEN_CHARS = '!@#$%^&*~`|<>';
const MIN_PHRASE_LENGTH = 12;
const MIN_OCCURRENCES = 3;

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
  // Extract word n-grams (2–6 words) as candidate phrases
  const words = text.split(/\s+/);
  for (let n = 2; n <= 6; n++) {
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

  // Sort by savings: (phrase.length - token.length) * occurrences
  const candidates = [...counts.entries()]
    .filter(([, count]) => count >= MIN_OCCURRENCES)
    .sort(([a, ac], [b, bc]) => bc * b.length - ac * a.length);

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
  // Sort tokens longest-first to avoid partial replacement collisions
  const entries = Object.entries(legend).sort((a, b) => b[0].length - a[0].length);
  let result = text;
  for (const [token, phrase] of entries) {
    result = result.split(token).join(phrase);
  }
  return result;
}
