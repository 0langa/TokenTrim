import { estimateTokens } from './tokenizer';
import { ALL_PROTECTED_SPANS, listModes, mapLegacyProfileToMode } from './modes';
import { protectSpans, restoreSpans } from './protectedSpans';
import type {
  CompressionMode,
  CompressionOptions,
  CompressionResult,
  ProtectedSpanStats,
  RiskEvent,
  TransformStat,
} from './types';
import { fillerRemoval } from './transforms/fillerRemoval';
import { articleRemoval } from './transforms/articleRemoval';
import { proseRewrite } from './transforms/proseRewrite';
import { abbreviationTransform } from './transforms/abbreviationTransform';
import { operatorTransform } from './transforms/operatorTransform';
import { numericTransform } from './transforms/numericTransform';
import { structuredDataTransform } from './transforms/structuredDataTransform';
import { deduplicationTransform } from './transforms/deduplicationTransform';

const EMPTY_SPAN_STATS: ProtectedSpanStats = {
  'fenced-code': 0,
  'inline-code': 0,
  url: 0,
  'file-path': 0,
  'cli-command': 0,
  'env-var': 0,
  'api-placeholder': 0,
  'number-unit': 0,
  'json-block': 0,
  'yaml-toml': 0,
  'markdown-table': 0,
  'markdown-heading': 0,
  email: 0,
  'quoted-string': 0,
};

function normalizeStructural(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+$/gm, '')
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(?<=\S) {2,}/g, ' ')
    .trimEnd();
}

function wordCount(s: string): number {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length;
}

function modeFromOptions(options: CompressionOptions): CompressionMode {
  if (options.mode) return options.mode;
  if (options.profileId) return mapLegacyProfileToMode(options.profileId);
  return 'normal';
}

function buildDiffPreview(stats: TransformStat[]): Array<{ kind: 'remove' | 'replace'; before: string; after?: string }> {
  const preview: Array<{ kind: 'remove' | 'replace'; before: string; after?: string }> = [];
  for (const stat of stats) {
    for (const example of stat.examples) {
      if (preview.length >= 30) return preview;
      if (example.after === '') {
        preview.push({ kind: 'remove', before: example.before.slice(0, 80) });
      } else {
        preview.push({ kind: 'replace', before: example.before.slice(0, 80), after: example.after.slice(0, 80) });
      }
    }
  }
  return preview;
}

function applyCavemanCompaction(input: string, mode: CompressionMode): { output: string; stat: TransformStat; events: RiskEvent[] } {
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
          [/\b(increase|improve)\b/gi, 'boost'],
          [/\b(decrease|reduce)\b/gi, 'cut'],
          [/\b(important|critical)\b/gi, '!'],
        ]
      : [
          [/\b(you should|you can|we should)\b/gi, ''],
          [/\b(it is|there is|there are)\b/gi, ''],
          [/\b(very|really|just)\b/gi, ''],
          [/\b(in order to)\b/gi, 'to'],
          [/\b(therefore|as a result)\b/gi, '=>'],
          [/\b(the|a|an)\b/gi, ''],
        ];

  let replacements = 0;
  let charsSaved = 0;
  const examples: Array<{ before: string; after: string }> = [];
  const events: RiskEvent[] = [];

  for (const [pattern, replacement] of rules) {
    out = out.replace(pattern, (match) => {
      replacements += 1;
      charsSaved += Math.max(0, match.length - replacement.length);
      if (examples.length < 10) {
        examples.push({ before: match, after: replacement });
        events.push({ transformId: 'caveman-compaction', category: 'possible-meaning-change', before: match, after: replacement });
      }
      return replacement;
    });
  }

  return {
    output: out,
    events,
    stat: {
      transformId: 'caveman-compaction',
      replacements,
      charsSaved,
      risk: mode === 'ultra' ? 'high' : 'medium',
      examples,
    },
  };
}

export function compress(text: string, options: CompressionOptions): CompressionResult {
  const mode = modeFromOptions(options);
  const originalChars = text.length;
  const originalWords = wordCount(text);
  const tokenizerKind = options.tokenizer ?? 'approx-generic';
  const warnings: string[] = [];
  const riskEvents: RiskEvent[] = [];

  try {
    const protectedRun = protectSpans(normalizeStructural(text), ALL_PROTECTED_SPANS);
    let output = protectedRun.text;
    const stats: TransformStat[] = [];

    const addEvents = (
      transformId: string,
      category: RiskEvent['category'],
      examples: Array<{ before: string; after: string }>,
    ) => {
      riskEvents.push(...examples.map((ex) => ({ transformId, category, before: ex.before, after: ex.after })));
    };

    // All modes: JSON minification (lossless)
    {
      const sd = structuredDataTransform(output);
      output = sd.output;
      if (sd.stat.replacements > 0) {
        stats.push(sd.stat);
        addEvents('structured-data', 'safe-structural-cleanup', sd.examples);
      }
    }

    if (mode !== 'light') {
      const fill = fillerRemoval(output);
      output = fill.output;
      stats.push(fill.stat);
      addEvents('filler-removal', 'wording-change', fill.examples);

      // Numeric: written numbers → digits
      const num = numericTransform(output);
      output = num.output;
      if (num.stat.replacements > 0) {
        stats.push(num.stat);
        addEvents('numeric', 'wording-change', num.examples);
      }
    }

    if (mode === 'normal' || mode === 'heavy' || mode === 'ultra') {
      const prose = proseRewrite(output, 'common');
      output = prose.output;
      stats.push(prose.stat);
      addEvents('prose-rewrite:common', 'wording-change', prose.examples);
    }

    if (mode === 'heavy' || mode === 'ultra') {
      const article = articleRemoval(output);
      output = article.output;
      stats.push(article.stat);
      addEvents('article-removal', 'wording-change', article.examples);

      const abbr = abbreviationTransform(output);
      output = abbr.output;
      stats.push(abbr.stat);
      addEvents('abbreviation', 'technical-term-adjacent-change', abbr.examples);

      const op = operatorTransform(output, mode === 'ultra' ? 'left-arrow' : 'bc');
      output = op.output;
      stats.push(op.stat);
      addEvents('operator', 'possible-meaning-change', op.examples);

      const caveman = applyCavemanCompaction(output, mode);
      output = caveman.output;
      stats.push(caveman.stat);
      riskEvents.push(...caveman.events);

      // Deduplication: remove repeated paragraphs
      const dedup = deduplicationTransform(output);
      output = dedup.output;
      if (dedup.stat.replacements > 0) {
        stats.push(dedup.stat);
        addEvents('deduplication', 'possible-meaning-change', dedup.examples);
      }
    }

    output = output
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    output = restoreSpans(output, protectedRun.spans);

    if (mode === 'ultra') {
      warnings.push('Ultra mode applies maximum compression; readability reduced.');
    }

    const outputChars = output.length;
    const outputWords = wordCount(output);
    const tokensBefore = estimateTokens(text, tokenizerKind).estimatedTokens;
    const tokensAfter = estimateTokens(output, tokenizerKind).estimatedTokens;

    return {
      output,
      mode,
      metrics: {
        originalChars,
        outputChars,
        charSavings: originalChars - outputChars,
        originalWords,
        outputWords,
        estimatedTokensBefore: tokensBefore,
        estimatedTokensAfter: tokensAfter,
        estimatedTokenSavings: tokensBefore - tokensAfter,
        tokenizerUsed: tokenizerKind,
      },
      report: {
        transformStats: stats,
        removedPhrases: stats.flatMap((s) => s.examples.filter((e) => e.after === '').map((e) => e.before)),
        replacedPhrases: stats.flatMap((s) => s.examples.filter((e) => e.after !== '')),
        abbreviationHits: stats.find((s) => s.transformId === 'abbreviation')?.replacements ?? 0,
        operatorHits: stats.find((s) => s.transformId === 'operator')?.replacements ?? 0,
        protectedSpanStats: protectedRun.stats,
        riskEvents,
        diffPreview: buildDiffPreview(stats),
      },
      warnings,
    };
  } catch (error) {
    return {
      output: text,
      mode,
      metrics: {
        originalChars,
        outputChars: originalChars,
        charSavings: 0,
        originalWords,
        outputWords: originalWords,
        estimatedTokensBefore: estimateTokens(text, tokenizerKind).estimatedTokens,
        estimatedTokensAfter: estimateTokens(text, tokenizerKind).estimatedTokens,
        estimatedTokenSavings: 0,
        tokenizerUsed: tokenizerKind,
      },
      report: {
        transformStats: [],
        removedPhrases: [],
        replacedPhrases: [],
        abbreviationHits: 0,
        operatorHits: 0,
        protectedSpanStats: EMPTY_SPAN_STATS,
        riskEvents: [],
        diffPreview: [],
      },
      warnings: ['Compression failed; original preserved.'],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export { listModes, estimateTokens };
