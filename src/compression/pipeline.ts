import { estimateTokens } from './tokenizer';
import { getProfile, listProfiles } from './profiles';
import { protectSpans, restoreSpans } from './protectedSpans';
import type {
  CompressionLegend,
  CompressionOptions,
  CompressionResult,
  RiskEvent,
  TransformStat,
  ValidationResult,
} from './types';
import { fillerRemoval } from './transforms/fillerRemoval';
import { articleRemoval } from './transforms/articleRemoval';
import { proseRewrite } from './transforms/proseRewrite';
import { abbreviationTransform } from './transforms/abbreviationTransform';
import { operatorTransform } from './transforms/operatorTransform';

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

function makeToken(index: number, baseText: string): string {
  let seed = 0;
  while (true) {
    const candidate = `\u241fTTK${index.toString(36)}_${seed.toString(36)}\u241f`;
    if (!baseText.includes(candidate)) {
      return candidate;
    }
    seed += 1;
  }
}

function applyDictionary(input: string, legend: CompressionLegend): { output: string; stat: TransformStat } {
  const words = input.split(/\s+/);
  const counts = new Map<string, number>();
  for (let n = 2; n <= 6; n += 1) {
    for (let i = 0; i <= words.length - n; i += 1) {
      const phrase = words.slice(i, i + n).join(' ');
      if (phrase.length >= 12) {
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }

  let output = input;
  let replacements = 0;
  let charsSaved = 0;
  const examples: Array<{ before: string; after: string }> = [];

  const candidates = [...counts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
  let idx = 0;
  for (const [phrase, count] of candidates) {
    if (!output.includes(phrase)) continue;
    const token = makeToken(idx, input + output + JSON.stringify(legend.tokenMap));
    const grossSaved = count * (phrase.length - token.length);
    const legendCost = token.length + phrase.length + 4;
    const net = grossSaved - legendCost;
    if (net <= 0) continue;

    legend.tokenMap[token] = phrase;
    output = output.split(phrase).join(token);
    replacements += count;
    charsSaved += net;
    if (examples.length < 10) examples.push({ before: phrase, after: token });
    idx += 1;
  }

  return {
    output,
    stat: {
      transformId: 'dictionary',
      replacements,
      charsSaved,
      risk: 'low',
      examples,
    },
  };
}

function decodeLegend(legend: CompressionLegend | Record<string, string> | null, profileId?: string): CompressionLegend {
  if (!legend) {
    return { version: 2, profileId: profileId ?? 'unknown', reversible: false, tokenMap: {} };
  }
  if (
    typeof legend === 'object' &&
    legend !== null &&
    'tokenMap' in legend &&
    'version' in legend &&
    'profileId' in legend &&
    'reversible' in legend
  ) {
    return legend as CompressionLegend;
  }
  return {
    version: 1,
    profileId: profileId ?? 'unknown',
    reversible: true,
    tokenMap: legend,
  };
}

export function decompress(text: string, legendInput: CompressionLegend | Record<string, string>): string {
  const legend = decodeLegend(legendInput);
  const entries = Object.entries(legend.tokenMap).sort((a, b) => b[0].length - a[0].length);
  let output = text;
  for (const [token, phrase] of entries) {
    output = output.split(token).join(phrase);
  }
  return output;
}

function buildValidation(
  profileId: string,
  original: string,
  compressed: string,
  legend: CompressionLegend | null,
): ValidationResult {
  const profile = getProfile(profileId);
  if (!profile) {
    return { passed: false, validationKind: 'none', baselineDescription: 'Unknown profile', warnings: ['Unknown profile id'] };
  }

  if (profile.guarantee === 'exact-roundtrip') {
    const restored = legend ? decompress(compressed, legend) : compressed;
    const passed = restored === original;
    return {
      passed,
      validationKind: 'exact-roundtrip',
      baselineDescription: 'decompress(compress(x)) must equal original input.',
      warnings: passed ? [] : ['Exact roundtrip failed.'],
    };
  }

  if (profile.guarantee === 'normalized-roundtrip') {
    const baseline = normalizeStructural(original);
    const restored = legend ? decompress(compressed, legend) : compressed;
    const passed = restored === baseline;
    return {
      passed,
      validationKind: 'normalized-roundtrip',
      baselineDescription: 'Roundtrip equals normalized structural baseline (line ending/whitespace cleanup).',
      warnings: passed ? [] : ['Normalized roundtrip failed.'],
    };
  }

  if (profile.guarantee === 'semantic-lossy') {
    return {
      passed: true,
      validationKind: 'lossy-no-roundtrip',
      baselineDescription: 'Lossy transform completed; no reversible parity guarantee.',
      warnings: ['This profile is one-way and may change wording.'],
    };
  }

  return { passed: true, validationKind: 'none', baselineDescription: 'No validation configured.', warnings: [] };
}

export function compress(text: string, options: CompressionOptions): CompressionResult {
  const profile = getProfile(options.profileId);
  const originalChars = text.length;
  const originalWords = wordCount(text);
  const tokenizerKind = options.tokenizer ?? 'approx-generic';
  const warnings: string[] = [];
  const riskEvents: RiskEvent[] = [];

  if (!profile) {
    return {
      output: text,
      legend: null,
      reversible: false,
      profileId: options.profileId,
      validation: { passed: false, validationKind: 'none', baselineDescription: 'Invalid profile.', warnings: ['Invalid profile.'] },
      metrics: {
        originalChars,
        outputChars: text.length,
        charSavings: 0,
        originalWords,
        outputWords: originalWords,
        estimatedTokensBefore: estimateTokens(text, tokenizerKind).estimatedTokens,
        estimatedTokensAfter: estimateTokens(text, tokenizerKind).estimatedTokens,
        estimatedTokenSavings: 0,
        legendOverhead: 0,
        netCharSavingsIncludingLegend: 0,
        tokenizerUsed: tokenizerKind,
      },
      report: {
        transformStats: [],
        removedPhrases: [],
        replacedPhrases: [],
        abbreviationHits: 0,
        operatorHits: 0,
        protectedSpanStats: {
          'fenced-code': 0,'inline-code': 0,url: 0,'file-path': 0,'cli-command': 0,'env-var': 0,'api-placeholder': 0,'number-unit': 0,'json-block': 0,'yaml-toml': 0,'markdown-table': 0,'markdown-heading': 0,email: 0,'quoted-string': 0,
        },
        dictionaryEntries: 0,
        bpeEntries: 0,
        riskEvents: [],
      },
      warnings: ['Unknown profile ID.'],
      error: 'Unknown profile ID.',
    };
  }

  try {
    const legend: CompressionLegend = {
      version: 2,
      profileId: profile.id,
      reversible: profile.reversible,
      tokenMap: {},
      createdAt: new Date().toISOString(),
      metadata: {},
    };

    const protectedRun = protectSpans(normalizeStructural(text), profile.protectedSpanTypes);
    let output = protectedRun.text;
    const stats: TransformStat[] = [];

    for (const transformId of profile.enabledTransforms) {
      if (transformId === 'normalize-structural') continue;
      if (transformId === 'filler-removal') {
        const res = fillerRemoval(output);
        output = res.output;
        stats.push(res.stat);
        riskEvents.push(...res.examples.map((ex) => ({ transformId, category: 'possible-meaning-change' as const, before: ex.before, after: ex.after })));
      } else if (transformId === 'article-removal') {
        const res = articleRemoval(output);
        output = res.output;
        stats.push(res.stat);
        riskEvents.push(...res.examples.map((ex) => ({ transformId, category: 'wording-change' as const, before: ex.before, after: ex.after })));
      } else if (transformId.startsWith('prose-rewrite:')) {
        const pack = transformId.split(':')[1];
        const res = proseRewrite(output, pack);
        output = res.output;
        stats.push(res.stat);
        riskEvents.push(...res.examples.map((ex) => ({ transformId, category: 'wording-change' as const, before: ex.before, after: ex.after })));
      } else if (transformId === 'abbreviation') {
        const res = abbreviationTransform(output);
        output = res.output;
        stats.push(res.stat);
        riskEvents.push(...res.examples.map((ex) => ({ transformId, category: 'technical-term-adjacent-change' as const, before: ex.before, after: ex.after })));
      } else if (transformId === 'operator') {
        const becauseMode = profile.id === 'lossy-agent' ? 'left-arrow' : 'bc';
        const res = operatorTransform(output, becauseMode);
        output = res.output;
        stats.push(res.stat);
        riskEvents.push(...res.examples.map((ex) => ({ transformId, category: 'possible-meaning-change' as const, before: ex.before, after: ex.after })));
      } else if (transformId === 'dictionary') {
        const res = applyDictionary(output, legend);
        output = res.output;
        stats.push(res.stat);
      }
    }

    output = restoreSpans(output, protectedRun.spans);

    const legendOverhead = Object.keys(legend.tokenMap).length > 0 ? JSON.stringify(legend).length : 0;
    const validation = buildValidation(profile.id, text, output, Object.keys(legend.tokenMap).length > 0 ? legend : null);

    if (profile.reversible && !validation.passed) {
      warnings.push('Lossless validation failed. Returning original input.');
      return {
        output: text,
        legend: null,
        profileId: profile.id,
        reversible: profile.reversible,
        validation,
        metrics: {
          originalChars,
          outputChars: originalChars,
          charSavings: 0,
          originalWords,
          outputWords: originalWords,
          estimatedTokensBefore: estimateTokens(text, tokenizerKind).estimatedTokens,
          estimatedTokensAfter: estimateTokens(text, tokenizerKind).estimatedTokens,
          estimatedTokenSavings: 0,
          legendOverhead: 0,
          netCharSavingsIncludingLegend: 0,
          tokenizerUsed: tokenizerKind,
        },
        report: {
          transformStats: stats,
          removedPhrases: [],
          replacedPhrases: stats.flatMap((s) => s.examples),
          abbreviationHits: stats.find((s) => s.transformId === 'abbreviation')?.replacements ?? 0,
          operatorHits: stats.find((s) => s.transformId === 'operator')?.replacements ?? 0,
          protectedSpanStats: protectedRun.stats,
          dictionaryEntries: Object.keys(legend.tokenMap).length,
          bpeEntries: 0,
          riskEvents,
        },
        warnings,
        error: 'Lossless validation failed.',
      };
    }

    if (!profile.reversible) {
      warnings.push(...validation.warnings);
    }

    const outputChars = output.length;
    const outputWords = wordCount(output);
    const tokensBefore = estimateTokens(text, tokenizerKind).estimatedTokens;
    const tokensAfter = estimateTokens(output, tokenizerKind).estimatedTokens;

    return {
      output,
      legend: profile.requiresLegend && Object.keys(legend.tokenMap).length > 0 ? legend : null,
      profileId: profile.id,
      reversible: profile.reversible,
      validation,
      metrics: {
        originalChars,
        outputChars,
        charSavings: originalChars - outputChars,
        originalWords,
        outputWords,
        estimatedTokensBefore: tokensBefore,
        estimatedTokensAfter: tokensAfter,
        estimatedTokenSavings: tokensBefore - tokensAfter,
        legendOverhead,
        netCharSavingsIncludingLegend: (originalChars - outputChars) - legendOverhead,
        tokenizerUsed: tokenizerKind,
      },
      report: {
        transformStats: stats,
        removedPhrases: stats.flatMap((s) => s.examples.filter((e) => e.after === '').map((e) => e.before)),
        replacedPhrases: stats.flatMap((s) => s.examples.filter((e) => e.after !== '')),
        abbreviationHits: stats.find((s) => s.transformId === 'abbreviation')?.replacements ?? 0,
        operatorHits: stats.find((s) => s.transformId === 'operator')?.replacements ?? 0,
        protectedSpanStats: protectedRun.stats,
        dictionaryEntries: Object.keys(legend.tokenMap).length,
        bpeEntries: 0,
        riskEvents,
      },
      warnings,
    };
  } catch (error) {
    return {
      output: text,
      legend: null,
      profileId: options.profileId,
      reversible: profile.reversible,
      validation: {
        passed: false,
        validationKind: profile.reversible ? 'normalized-roundtrip' : 'lossy-no-roundtrip',
        baselineDescription: 'Transform failed.',
        warnings: ['Transform failed; original preserved.'],
      },
      metrics: {
        originalChars,
        outputChars: text.length,
        charSavings: 0,
        originalWords,
        outputWords: originalWords,
        estimatedTokensBefore: estimateTokens(text, tokenizerKind).estimatedTokens,
        estimatedTokensAfter: estimateTokens(text, tokenizerKind).estimatedTokens,
        estimatedTokenSavings: 0,
        legendOverhead: 0,
        netCharSavingsIncludingLegend: 0,
        tokenizerUsed: tokenizerKind,
      },
      report: {
        transformStats: [],
        removedPhrases: [],
        replacedPhrases: [],
        abbreviationHits: 0,
        operatorHits: 0,
        protectedSpanStats: {
          'fenced-code': 0,'inline-code': 0,url: 0,'file-path': 0,'cli-command': 0,'env-var': 0,'api-placeholder': 0,'number-unit': 0,'json-block': 0,'yaml-toml': 0,'markdown-table': 0,'markdown-heading': 0,email: 0,'quoted-string': 0,
        },
        dictionaryEntries: 0,
        bpeEntries: 0,
        riskEvents: [],
      },
      warnings: ['Transform failure; original preserved.'],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export { listProfiles, estimateTokens };
