import type { RiskLevel, TransformStat, TransformExample } from '../types';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MARKER = '[duplicate removed]';

function wordTrigrams(text: string): Set<string> {
  const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
  const s = new Set<string>();
  for (let i = 0; i <= words.length - 3; i++) s.add(words.slice(i, i + 3).join(' '));
  return s;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

function sentenceNearDedup(input: string): { output: string; replacements: number; charsSaved: number; examples: TransformExample[] } {
  const regex = /[.!?]\s+|\n/g;
  const sentences: string[] = [];
  const delimiters: string[] = [];
  let lastIndex = 0;
  for (const match of input.matchAll(regex)) {
    sentences.push(input.slice(lastIndex, match.index!));
    delimiters.push(match[0]);
    lastIndex = match.index! + match[0].length;
  }
  sentences.push(input.slice(lastIndex));

  const keptTrigrams: Set<string>[] = [];
  let replacements = 0;
  let charsSaved = 0;
  const examples: TransformExample[] = [];
  let output = '';

  for (let i = 0; i < sentences.length; i++) {
    const sent = sentences[i];
    const words = sent.trim().match(/\b\w+\b/g) ?? [];
    if (words.length >= 8) {
      const trigrams = wordTrigrams(sent);
      let isDup = false;
      for (const kept of keptTrigrams) {
        if (jaccard(trigrams, kept) >= 0.75) {
          isDup = true;
          break;
        }
      }
      if (isDup) {
        replacements += 1;
        charsSaved += sent.length;
        if (examples.length < 5) examples.push({ before: sent.trim().slice(0, 80), after: MARKER });
        continue;
      }
      keptTrigrams.push(trigrams);
    }
    output += sent;
    if (i < delimiters.length) output += delimiters[i];
  }

  return { output, replacements, charsSaved, examples };
}

export function deduplicationTransform(input: string): {
  output: string;
  stat: TransformStat;
  examples: TransformExample[];
} {
  const risk: RiskLevel = 'medium';
  const paragraphs = input.split(/\n{2,}/);
  const seen = new Set<number>();
  let replacements = 0;
  let charsSaved = 0;
  const examples: TransformExample[] = [];

  const result = paragraphs.map((para) => {
    const key = hashStr(para.trim().toLowerCase());
    if (seen.has(key) && para.trim().length > 20) {
      replacements += 1;
      charsSaved += para.length - MARKER.length;
      if (examples.length < 5) examples.push({ before: para.slice(0, 80), after: MARKER });
      return MARKER;
    }
    seen.add(key);
    return para;
  });

  let output = result.join('\n\n');

  // Sentence-level near-duplicate detection (second pass)
  const sentenceResult = sentenceNearDedup(output);
  output = sentenceResult.output;
  replacements += sentenceResult.replacements;
  charsSaved += sentenceResult.charsSaved;
  examples.push(...sentenceResult.examples.slice(0, 5 - examples.length));

  return {
    output,
    examples,
    stat: { transformId: 'deduplication', replacements, charsSaved, risk, examples },
  };
}
