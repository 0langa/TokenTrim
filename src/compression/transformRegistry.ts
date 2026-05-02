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

function cavemanCompactionTransform(input: string, mode: CompressionMode) {
  let out = input;
  const rules: Array<[RegExp, string]> =
    mode === 'ultra'
      ? [
          [/\b(you should|you can|you need to|we should|we need to)\b/gi, ''],
          [/\b(it is|there is|there are|this is|that is)\b/gi, ''],
          [/\b(very|really|quite|just|actually|basically)\b/gi, ''],
          [/\b(to be able to|in order to)\b/gi, 'to'],
          [/\b(do not|does not|did not|cannot)\b/gi, 'not'],
          [/\b(please|kindly)\b/gi, ''],
          [/\b(therefore|hence|as a result)\b/gi, '=>'],
          [/\b(the|a|an|that|which|who|whom|whose)\b/gi, ''],
          [/\b(should|would|could|might|may)\b/gi, ''],
          [/\b(of|for|to|from|into|onto|upon|over|under)\b/gi, ''],
          [/\b(is|are|was|were|be|been|being)\b/gi, ''],
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
  if (mode === 'ultra' || mode === 'heavy') {
    out = out.replace(/\b[A-Za-z]{7,}\b/g, (word) => {
      const squeezed = word[0] + word.slice(1).replace(/[aeiou]/gi, '');
      if (squeezed.length < word.length) {
        replacements += 1;
        charsSaved += word.length - squeezed.length;
        if (examples.length < 10) examples.push({ before: word, after: squeezed });
        return squeezed;
      }
      return word;
    });
  }
  const risk: 'medium' | 'high' = mode === 'ultra' ? 'high' : 'medium';
  if (mode === 'ultra') {
    out = out
      .replace(/\b(?:and|or|with|without|from|into|onto|upon|over|under)\b/gi, '')
      .replace(/[^\S\n]{2,}/g, ' ');
  }
  return { output: out, stat: { transformId: 'caveman-compaction', replacements, charsSaved, risk, examples } };
}

const applyProfiles: CompressionProfile[] = ['general', 'agent-context', 'repo-context', 'logs', 'markdown-docs', 'chat-history'];

export const TRANSFORM_REGISTRY: TokenTrimTransform[] = [
  { id: 'markdown-cleanup', label: 'Markdown Cleanup', description: 'Normalize markdown whitespace safely', risk: 'safe', defaultModes: ['light', 'normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => markdownCompressionTransform(input) },
  { id: 'structured-data', label: 'Structured Data', description: 'Minify JSON structures where safe', risk: 'safe', defaultModes: ['light', 'normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => structuredDataTransform(input) },
  { id: 'filler-removal', label: 'Filler Removal', description: 'Remove low-signal filler phrases', risk: 'medium', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => fillerRemoval(input) },
  { id: 'numeric', label: 'Numeric Normalization', description: 'Convert words to compact number forms', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => numericTransform(input) },
  { id: 'prose-rewrite:common', label: 'Prose Rewrite', description: 'Rewrite verbose prose', risk: 'medium', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => proseRewrite(input, 'common') },
  { id: 'article-removal', label: 'Article Removal', description: 'Drop articles in prose', risk: 'medium', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => articleRemoval(input) },
  { id: 'abbreviation', label: 'Abbreviation', description: 'Use engineering abbreviations', risk: 'low', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => abbreviationTransform(input) },
  { id: 'operator', label: 'Operator', description: 'Replace words with symbols', risk: 'high', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input, ctx) => operatorTransform(input, ctx.mode === 'ultra' ? 'left-arrow' : 'bc') },
  { id: 'caveman-compaction', label: 'Caveman', description: 'Telegraphic compaction', risk: 'high', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input, ctx) => cavemanCompactionTransform(input, ctx.mode) },
  { id: 'deduplication', label: 'Deduplication', description: 'Remove repeated paragraphs', risk: 'medium', defaultModes: ['heavy', 'ultra', 'custom'], profiles: applyProfiles, apply: (input) => deduplicationTransform(input) },
  { id: 'section-salience', label: 'Section Salience', description: 'Drop low-value blocks', risk: 'medium', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: ['agent-context', 'repo-context', 'chat-history', 'markdown-docs'], profileOnly: true, apply: (input, ctx) => sectionSalienceTransform(input, ctx.mode === 'heavy' || ctx.mode === 'ultra') },
  { id: 'log-compression', label: 'Log Compression', description: 'Collapse repeated log lines', risk: 'low', defaultModes: ['normal', 'heavy', 'ultra', 'custom'], profiles: ['logs'], profileOnly: true, apply: (input) => logCompressionTransform(input) },
];

export function getAllTransformIds(): string[] {
  return TRANSFORM_REGISTRY.map((t) => t.id);
}

export function findTransform(id: string): TokenTrimTransform | undefined {
  return TRANSFORM_REGISTRY.find((t) => t.id === id);
}

export function defaultTransformsForMode(mode: CompressionMode): string[] {
  return TRANSFORM_REGISTRY.filter((t) => t.defaultModes.includes(mode)).map((t) => t.id);
}
