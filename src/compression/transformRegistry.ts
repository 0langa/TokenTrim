import type { CompressionMode, CompressionProfile } from './types';
import type { TokenTrimTransform } from './transforms/types';
import { fillerRemoval } from './transforms/fillerRemoval';
import { articleRemoval } from './transforms/articleRemoval';
import { proseRewrite } from './transforms/proseRewrite';
import { abbreviationTransform } from './transforms/abbreviationTransform';
import { operatorTransform } from './transforms/operatorTransform';
import { numericTransform } from './transforms/numericTransform';
import { structuredDataTransform } from './transforms/structuredDataTransform';
import { deduplicationTransform } from './transforms/deduplicationTransform';
import { sectionSalienceTransform } from './transforms/sectionSalienceTransform';
import { logCompressionTransform } from './transforms/logCompressionTransform';
import { markdownCompressionTransform } from './transforms/markdownCompressionTransform';
import { contractionTransform } from './transforms/contractionTransform';
import { synonymTransform } from './transforms/synonymTransform';
import { punctuationTransform } from './transforms/punctuationTransform';
import { repeatedWordTransform } from './transforms/repeatedWordTransform';
import { numberRangeTransform } from './transforms/numberRangeTransform';
import { timeDurationTransform } from './transforms/timeDurationTransform';
import { pleonasmTransform } from './transforms/pleonasmTransform';
import { csvTransform } from './transforms/csvTransform';
import { jsonlTransform } from './transforms/jsonlTransform';
import { xmlTransform } from './transforms/xmlTransform';

function cavemanCompactionTransform(input: string, mode: CompressionMode) {
  let out = input;
  const rules: Array<[RegExp, string]> =
    mode === 'ultra'
      ? [
          // Heavy base rules
          [/\b(the|a|an)\b/gi, ''],
          [/\b(therefore|as a result)\b/gi, '=>'],
          // Ultra-only: safe removals (no requirements/negations/prepositions)
          [/\b(it is|there is|there are|this is|that is)\b/gi, ''],
          [/\b(very|really|quite|just|actually|basically)\b/gi, ''],
          [/\b(please|kindly)\b/gi, ''],
          [/\b(to be able to|in order to)\b/gi, 'to'],
          // Negations → contractions (preserves semantic safety)
          [/\bdo not\b/gi, "don't"],
          [/\bdoes not\b/gi, "doesn't"],
          [/\bdid not\b/gi, "didn't"],
          [/\bcannot\b/gi, "can't"],
          [/\bwill not\b/gi, "won't"],
          [/\bwould not\b/gi, "wouldn't"],
          [/\bshould not\b/gi, "shouldn't"],
          [/\bcould not\b/gi, "couldn't"],
          [/\bmight not\b/gi, "mightn't"],
          [/\bmust not\b/gi, "mustn't"],
          [/\bis not\b/gi, "isn't"],
          [/\bare not\b/gi, "aren't"],
          [/\bwas not\b/gi, "wasn't"],
          [/\bwere not\b/gi, "weren't"],
          [/\bhas not\b/gi, "hasn't"],
          [/\bhave not\b/gi, "haven't"],
          [/\bhad not\b/gi, "hadn't"],
        ]
      : [[/\b(the|a|an)\b/gi, ''], [/\b(therefore|as a result)\b/gi, '=>']];
  let replacements = 0;
  let charsSaved = 0;
  const examples: Array<{ before: string; after: string }> = [];
  for (const [p, r] of rules) {
    out = out.replace(p, (m) => {
      replacements += 1;
      charsSaved += Math.max(0, m.length - r.length);
      if (examples.length < 10) examples.push({ before: m, after: r });
      return r;
    });
  }
  // Vowel stripping: more aggressive in ultra (5+ chars) vs heavy (7+ chars)
  // Negative lookahead skips contraction bases (e.g. mustn't → don't match "mustn")
  const PROTECTED_WORDS = new Set([
    'must', 'should', 'shall', 'required', 'forbidden', 'may',
    'not', 'never', 'no', 'cannot', 'cant', 'dont', 'doesnt', 'didnt',
    'wont', 'wouldnt', 'couldnt', 'mightnt', 'mustnt', 'isnt', 'arent',
    'wasnt', 'werent', 'hasnt', 'havent', 'hadnt',
    'true', 'false', 'null', 'undefined', 'error', 'warning', 'fatal',
  ]);
  const minLength = mode === 'ultra' ? 5 : 7;
  out = out.replace(new RegExp('\\b[A-Za-z]{' + minLength + ',}\\b(?!\')', 'g'), (word) => {
    if (PROTECTED_WORDS.has(word.toLowerCase())) return word;
    const squeezed = word[0] + word.slice(1).replace(/[aeiou]/gi, '');
    if (squeezed.length < word.length) {
      replacements += 1;
      charsSaved += word.length - squeezed.length;
      if (examples.length < 10) examples.push({ before: word, after: squeezed });
      return squeezed;
    }
    return word;
  });
  const risk: 'medium' | 'high' = mode === 'ultra' ? 'high' : 'medium';
  if (mode === 'ultra') {
    out = out.replace(/[^\S\n]{2,}/g, ' ');
  }
  return { output: out, stat: { transformId: 'caveman-compaction', replacements, charsSaved, risk, examples } };
}

const applyProfiles: CompressionProfile[] = ['general', 'agent-context', 'repo-context', 'logs', 'markdown-docs', 'chat-history', 'csv', 'jsonl', 'xml'];

export const TRANSFORM_REGISTRY: TokenTrimTransform[] = [
  { id: 'markdown-cleanup', label: 'Markdown Cleanup', description: 'Normalize markdown whitespace safely', risk: 'safe', defaultModes: ['light', 'normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => markdownCompressionTransform(input) },
  { id: 'structured-data', label: 'Structured Data', description: 'Minify JSON structures where safe', risk: 'safe', defaultModes: ['light', 'normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => structuredDataTransform(input) },
  { id: 'filler-removal', label: 'Filler Removal', description: 'Remove low-signal filler phrases', risk: 'medium', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => fillerRemoval(input) },
  { id: 'numeric', label: 'Numeric Normalization', description: 'Convert words to compact number forms', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => numericTransform(input) },
  { id: 'prose-rewrite:common', label: 'Prose Rewrite', description: 'Rewrite verbose prose', risk: 'medium', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => proseRewrite(input, 'common') },
  { id: 'contraction', label: 'Contraction', description: 'Contract common word pairs', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => contractionTransform(input) },
  { id: 'synonym', label: 'Synonym Substitution', description: 'Replace verbose words with shorter synonyms', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => synonymTransform(input) },
  { id: 'punctuation', label: 'Punctuation Cleanup', description: 'Clean up punctuation and whitespace', risk: 'safe', defaultModes: ['light', 'normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => punctuationTransform(input) },
  { id: 'repeated-word', label: 'Repeated Word Collapse', description: 'Collapse repeated words', risk: 'safe', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => repeatedWordTransform(input) },
  { id: 'number-range', label: 'Number Range Compression', description: 'Compress number ranges and approximations', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => numberRangeTransform(input) },
  { id: 'time-duration', label: 'Time Duration Compression', description: 'Compress time durations', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => timeDurationTransform(input) },
  { id: 'pleonasm', label: 'Pleonasm Removal', description: 'Remove redundant word pairs', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => pleonasmTransform(input) },
  { id: 'article-removal', label: 'Article Removal', description: 'Drop articles in prose', risk: 'medium', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => articleRemoval(input) },
  { id: 'abbreviation', label: 'Abbreviation', description: 'Use engineering abbreviations', risk: 'low', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => abbreviationTransform(input) },
  { id: 'operator', label: 'Operator', description: 'Replace words with symbols', risk: 'high', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input, ctx) => operatorTransform(input, ctx.mode === 'ultra' ? 'left-arrow' : 'bc') },
  { id: 'caveman-compaction', label: 'Caveman', description: 'Telegraphic compaction', risk: 'high', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input, ctx) => cavemanCompactionTransform(input, ctx.mode) },
  { id: 'deduplication', label: 'Deduplication', description: 'Remove repeated paragraphs', risk: 'medium', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => deduplicationTransform(input) },
  { id: 'section-salience', label: 'Section Salience', description: 'Drop low-value blocks', risk: 'medium', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: ['agent-context', 'repo-context', 'chat-history', 'markdown-docs'], profileOnly: true, apply: (input, ctx) => sectionSalienceTransform(input, ctx.mode === 'heavy' || ctx.mode === 'ultra') },
  { id: 'log-compression', label: 'Log Compression', description: 'Collapse repeated log lines', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: ['logs'], profileOnly: true, apply: (input) => logCompressionTransform(input) },
  { id: 'csv-cleanup', label: 'CSV Cleanup', description: 'Collapse repeated cells and normalize CSV whitespace', risk: 'safe', defaultModes: ['light', 'normal', 'heavy', 'ultra', 'custom'], profiles: ['csv'], profileOnly: true, apply: (input) => csvTransform(input) },
  { id: 'jsonl-minify', label: 'JSONL Minify', description: 'Minify JSON lines and remove trailing commas', risk: 'safe', defaultModes: ['light', 'normal', 'heavy', 'ultra', 'custom'], profiles: ['jsonl'], profileOnly: true, apply: (input) => jsonlTransform(input) },
  { id: 'xml-cleanup', label: 'XML Cleanup', description: 'Remove comments, collapse attributes, normalize entities', risk: 'safe', defaultModes: ['light', 'normal', 'heavy', 'ultra', 'custom'], profiles: ['xml'], profileOnly: true, apply: (input) => xmlTransform(input) },
];

export function getAllTransformIds(): string[] {
  return TRANSFORM_REGISTRY.map((t) => t.id);
}

export function getAllTransforms(): TokenTrimTransform[] {
  return [...TRANSFORM_REGISTRY];
}

export function findTransform(id: string): TokenTrimTransform | undefined {
  return TRANSFORM_REGISTRY.find((t) => t.id === id);
}

export function defaultTransformsForMode(mode: CompressionMode): string[] {
  return TRANSFORM_REGISTRY.filter((t) => t.defaultModes.includes(mode)).map((t) => t.id);
}
