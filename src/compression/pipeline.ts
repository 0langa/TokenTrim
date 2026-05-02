import { estimateTokens } from './tokenizer';
import { ALL_PROTECTED_SPANS, listModes, mapLegacyProfileToMode } from './modes';
import { PROFILE_TRANSFORM_ORDER, mapLegacyProfileId } from './profiles';
import { protectSpans, restoreSpans } from './protectedSpans';
import { defaultTransformsForMode, findTransform } from './transformRegistry';
import type {
  CompressionMode,
  CompressionOptions,
  CompressionProfile,
  CompressionResult,
  ProtectedSpanStats,
  RiskEvent,
  RiskLevel,
  SafetyIssue,
  TransformStat,
} from './types';
import { validateSemanticSafety } from './safety/semanticValidator';
import type { TransformContext } from './transforms/types';

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

const RANK: Record<RiskLevel, number> = { safe: 0, low: 1, medium: 2, high: 3 };

function normalizeStructural(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trimEnd();
}

function cleanupWhitespaceSafe(text: string): string {
  return text
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function wordCount(s: string): number {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length;
}

function modeFromOptions(options: CompressionOptions): CompressionMode {
  if (options.mode) return options.mode;
  if (options.profileId) return mapLegacyProfileToMode(options.profileId);
  return 'normal';
}

function profileFromOptions(options: CompressionOptions): CompressionProfile | undefined {
  if (options.profile) return options.profile;
  if (options.profileId) return mapLegacyProfileId(options.profileId);
  return undefined;
}

function buildDiffPreview(stats: TransformStat[]): Array<{ kind: 'remove' | 'replace'; before: string; after?: string }> {
  const preview: Array<{ kind: 'remove' | 'replace'; before: string; after?: string }> = [];
  for (const stat of stats) {
    for (const example of stat.examples) {
      if (preview.length >= 30) return preview;
      if (example.after === '') preview.push({ kind: 'remove', before: example.before.slice(0, 80) });
      else preview.push({ kind: 'replace', before: example.before.slice(0, 80), after: example.after.slice(0, 80) });
    }
  }
  return preview;
}

function chooseTransforms(mode: CompressionMode, profile: CompressionProfile | undefined, enabled?: string[]): string[] {
  if (enabled && enabled.length > 0) return enabled;
  if (profile) return PROFILE_TRANSFORM_ORDER[profile];
  return defaultTransformsForMode(mode);
}

function allowsRisk(maxRisk: RiskLevel | undefined, risk: RiskLevel): boolean {
  if (!maxRisk) return true;
  return RANK[risk] <= RANK[maxRisk];
}

function riskCategoryFromRisk(risk: RiskLevel): RiskEvent['category'] {
  if (risk === 'safe') return 'safe-structural-cleanup';
  if (risk === 'low') return 'technical-term-adjacent-change';
  if (risk === 'medium') return 'wording-change';
  return 'possible-meaning-change';
}

export function compress(text: string, options: CompressionOptions): CompressionResult {
  const mode = modeFromOptions(options);
  const profile = profileFromOptions(options);
  const originalChars = text.length;
  const originalWords = wordCount(text);
  const tokenizerKind = options.tokenizer ?? 'approx-generic';
  const warnings: string[] = [];
  const riskEvents: RiskEvent[] = [];
  const safetyIssues: SafetyIssue[] = [];
  const rejectedTransforms: string[] = [];

  try {
    const protectedRun = protectSpans(normalizeStructural(text), ALL_PROTECTED_SPANS);
    let output = protectedRun.text;
    const stats: TransformStat[] = [];
    const transformIds = chooseTransforms(mode, profile, options.enabledTransforms);

    for (const id of transformIds) {
      const transform = findTransform(id);
      if (!transform) continue;
      if (!allowsRisk(options.maxRisk, transform.risk)) {
        rejectedTransforms.push(id);
        warnings.push(`Skipped ${id} due to maxRisk=${options.maxRisk}`);
        continue;
      }

      const ctx: TransformContext = {
        mode,
        profile,
        tokenizer: tokenizerKind,
        targetTokens: options.targetTokens,
        maxRisk: options.maxRisk,
      };

      const before = output;
      const result = transform.apply(before, ctx);
      const issues = validateSemanticSafety(before, result.output, protectedRun.spans, protectedRun.spans);
      const hasError = issues.some((i) => i.severity === 'error');

      if (hasError) {
        rejectedTransforms.push(id);
        safetyIssues.push(...issues);
        warnings.push(`Rejected transform ${id} due to semantic safety issues.`);
        continue;
      }

      output = result.output;
      stats.push(result.stat);
      safetyIssues.push(...issues);
      riskEvents.push(
        ...result.stat.examples.map((ex) => ({
          transformId: id,
          category: riskCategoryFromRisk(transform.risk),
          before: ex.before,
          after: ex.after,
        })),
      );
    }

    output = cleanupWhitespaceSafe(output);
    output = restoreSpans(output, protectedRun.spans);

    const tokenBefore = estimateTokens(text, tokenizerKind);
    const tokenAfter = estimateTokens(output, tokenizerKind);
    const outputChars = output.length;
    const outputWords = wordCount(output);

    const budgetReached = options.targetTokens ? tokenAfter.tokens <= options.targetTokens : undefined;
    if (options.targetTokens && !budgetReached) warnings.push(`Target token budget ${options.targetTokens} not reached.`);

    return {
      output,
      mode,
      profile,
      targetTokens: options.targetTokens,
      budgetReached,
      metrics: {
        originalChars,
        outputChars,
        charSavings: originalChars - outputChars,
        originalWords,
        outputWords,
        estimatedTokensBefore: tokenBefore.tokens,
        estimatedTokensAfter: tokenAfter.tokens,
        estimatedTokenSavings: tokenBefore.tokens - tokenAfter.tokens,
        tokenizerUsed: tokenAfter.tokenizer,
        tokenizerExact: tokenAfter.exact,
      },
      report: {
        transformStats: stats,
        removedPhrases: stats.flatMap((s) => s.examples.filter((e) => e.after === '').map((e) => ({ before: e.before }))),
        replacedPhrases: stats.flatMap((s) => s.examples.filter((e) => e.after !== '').map((e) => ({ before: e.before, after: e.after }))),
        abbreviationHits: stats.find((s) => s.transformId === 'abbreviation')?.replacements ?? 0,
        operatorHits: stats.find((s) => s.transformId === 'operator')?.replacements ?? 0,
        protectedSpanStats: protectedRun.stats,
        riskEvents,
        diffPreview: buildDiffPreview(stats),
      },
      warnings,
      safetyIssues,
      rejectedTransforms,
    };
  } catch (error) {
    const tokenBefore = estimateTokens(text, tokenizerKind);
    return {
      output: text,
      mode,
      profile,
      targetTokens: options.targetTokens,
      budgetReached: options.targetTokens ? false : undefined,
      metrics: {
        originalChars,
        outputChars: originalChars,
        charSavings: 0,
        originalWords,
        outputWords: originalWords,
        estimatedTokensBefore: tokenBefore.tokens,
        estimatedTokensAfter: tokenBefore.tokens,
        estimatedTokenSavings: 0,
        tokenizerUsed: tokenBefore.tokenizer,
        tokenizerExact: tokenBefore.exact,
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
      safetyIssues: [],
      rejectedTransforms: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export { listModes, estimateTokens };
