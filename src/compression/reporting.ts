import type { CompressionExportReport, CompressionResult } from './types';

export function createCompressionReport(result: CompressionResult): CompressionExportReport {
  const tokenPercent = result.metrics.estimatedTokensBefore > 0
    ? (result.metrics.estimatedTokenSavings / result.metrics.estimatedTokensBefore) * 100
    : 0;

  return {
    version: '1.3.0',
    input: { chars: result.metrics.originalChars, tokens: result.metrics.estimatedTokensBefore },
    output: { chars: result.metrics.outputChars, tokens: result.metrics.estimatedTokensAfter },
    savings: {
      chars: result.metrics.charSavings,
      tokens: result.metrics.estimatedTokenSavings,
      tokenPercent,
    },
    tokenizer: result.metrics.tokenizerUsed,
    tokenizerExact: result.metrics.tokenizerExact,
    mode: result.mode,
    profile: result.profile,
    targetTokens: result.targetTokens,
    budgetReached: result.budgetReached,
    transforms: result.report.transformStats,
    safetyIssues: result.safetyIssues,
    rejectedTransforms: result.rejectedTransforms,
    warnings: result.warnings,
  };
}
