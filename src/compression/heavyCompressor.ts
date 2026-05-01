import { mediumCompress, mediumDecompress } from './mediumCompressor';

const MAX_BPE_MERGES = 500;
const BPE_MERGES_KEY = '__bpe_merges__';

export interface HeavyResult {
  text: string;
  legend: Record<string, string>;
}

function makeBpeToken(n: number): string {
  return `[BPE${n}]`;
}

// Split a line into leading whitespace and word tokens
function splitLine(line: string): { indent: string; words: string[] } {
  const indentEnd = line.search(/\S/);
  if (indentEnd === -1) return { indent: line, words: [] };
  const indent = line.slice(0, indentEnd);
  const words = line.slice(indentEnd).split(' ');
  return { indent, words };
}

// Count adjacent word bigrams across all line word arrays (skip empty tokens)
function countBigrams(lineWords: string[][]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const words of lineWords) {
    for (let i = 0; i < words.length - 1; i++) {
      if (!words[i] || !words[i + 1]) continue;
      const key = words[i] + '\x00' + words[i + 1];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

// Find the bigram with the highest count (must be >= 2)
function findBestBigram(counts: Map<string, number>): { key: string; count: number } | null {
  let bestKey = '';
  let bestCount = 1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  return bestKey ? { key: bestKey, count: bestCount } : null;
}

// Replace all occurrences of (left, right) adjacent pair in a word array with token
function applyMerge(words: string[], left: string, right: string, token: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < words.length) {
    if (i < words.length - 1 && words[i] === left && words[i + 1] === right) {
      result.push(token);
      i += 2;
    } else {
      result.push(words[i]);
      i++;
    }
  }
  return result;
}

export function heavyCompress(raw: string): HeavyResult {
  const { text: medText, legend: phraseLegend } = mediumCompress(raw);

  const lines = medText.split('\n');
  const lineIndents: string[] = [];
  const lineWords: string[][] = [];

  for (const line of lines) {
    const { indent, words } = splitLine(line);
    lineIndents.push(indent);
    lineWords.push(words);
  }

  const mergeList: string[] = [];

  for (let n = 0; n < MAX_BPE_MERGES; n++) {
    const counts = countBigrams(lineWords);
    const best = findBestBigram(counts);
    if (!best) break;

    const sepIdx = best.key.indexOf('\x00');
    const left = best.key.slice(0, sepIdx);
    const right = best.key.slice(sepIdx + 1);
    const token = makeBpeToken(n);

    // Only merge if it saves characters
    const savedPerOccurrence = left.length + 1 + right.length - token.length;
    if (savedPerOccurrence <= 0) break;

    for (let i = 0; i < lineWords.length; i++) {
      lineWords[i] = applyMerge(lineWords[i], left, right, token);
    }

    mergeList.push(`${token}=${left}\x01${right}`);
  }

  const compressedLines = lineWords.map((words, i) => lineIndents[i] + words.join(' '));
  const compressedText = compressedLines.join('\n');

  const legend: Record<string, string> = {
    ...phraseLegend,
    [BPE_MERGES_KEY]: mergeList.join('|'),
  };

  return { text: compressedText, legend };
}

export function heavyDecompress(text: string, legend: Record<string, string>): string {
  const serialized = legend[BPE_MERGES_KEY] ?? '';
  const phraseLegend = Object.fromEntries(
    Object.entries(legend).filter(([k]) => k !== BPE_MERGES_KEY)
  );

  if (serialized) {
    const merges = serialized.split('|').map(entry => {
      const eqIdx = entry.indexOf('=');
      const token = entry.slice(0, eqIdx);
      const rest = entry.slice(eqIdx + 1);
      const x1Idx = rest.indexOf('\x01');
      return {
        token,
        left: rest.slice(0, x1Idx),
        right: rest.slice(x1Idx + 1),
      };
    });

    // Reverse order: expand outermost merges (highest N) first
    for (let i = merges.length - 1; i >= 0; i--) {
      const { token, left, right } = merges[i];
      text = text.split(token).join(left + ' ' + right);
    }
  }

  return mediumDecompress(text, phraseLegend);
}
