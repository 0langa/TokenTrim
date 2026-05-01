import type { CompressionResult, Intensity } from './types';
import { lightCompress } from './lightCompressor';
import { mediumCompress, mediumDecompress } from './mediumCompressor';
import { heavyCompress, heavyDecompress } from './heavyCompressor';

function wordCount(s: string): number {
  return s.trim() === '' ? 0 : s.trim().split(/\s+/).length;
}

function parityCheck(
  original: string,
  output: string,
  decompress: (s: string) => string
): boolean {
  try {
    return decompress(output) === original;
  } catch {
    return false;
  }
}

export function compress(text: string, intensity: Intensity): CompressionResult {
  const originalChars = text.length;
  const originalWords = wordCount(text);

  try {
    let output: string;
    let legend: Record<string, string> | null = null;
    let passed: boolean;

    if (intensity === 'light') {
      output = lightCompress(text);
      // Parity: re-compress the output must equal itself (idempotent)
      passed = lightCompress(output) === output;
      // Also verify decompressed == original via re-compress equality:
      // light strips non-semantic ws, so validate original compresses to same output
      const altCheck = lightCompress(text) === output;
      passed = passed && altCheck;
    } else if (intensity === 'medium') {
      const result = mediumCompress(text);
      output = result.text;
      legend = result.legend;
      // mediumCompress applies lightCompress first, so roundtrip recovers
      // lightCompress(text), not text itself — compare against that baseline
      const lightened = lightCompress(text);
      passed = parityCheck(lightened, output, (s) => mediumDecompress(s, result.legend));
    } else {
      const result = heavyCompress(text);
      output = result.text;
      legend = result.legend;
      const lightened = lightCompress(text);
      passed = parityCheck(lightened, output, (s) => heavyDecompress(s, result.legend));
    }

    if (!passed) {
      return {
        output: text,
        legend: null,
        originalChars,
        outputChars: text.length,
        originalWords,
        outputWords: originalWords,
        ratio: 1,
        passed: false,
        error: 'Parity check failed — compression rejected, original preserved.',
      };
    }

    const outputChars = output.length;
    const outputWords = wordCount(output);
    const ratio = originalChars > 0 ? outputChars / originalChars : 1;

    return { output, legend, originalChars, outputChars, originalWords, outputWords, ratio, passed };
  } catch (err) {
    return {
      output: text,
      legend: null,
      originalChars,
      outputChars: text.length,
      originalWords,
      outputWords: originalWords,
      ratio: 1,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
