import type { ProtectedSpan, ProtectedSpanStats, ProtectedSpanType } from './types';

const PATTERNS: Record<ProtectedSpanType, RegExp> = {
  'fenced-code': /```[\s\S]*?```/g,
  'inline-code': /`[^`\n]+`/g,
  url: /https?:\/\/[^\s)\]>]+/g,
  'file-path': /\b(?:[A-Za-z]:\\[^\s]+|\.?\/?(?:[\w.-]+\/)+[\w.-]+)\b/g,
  'cli-command': /(^|\n)\s*[$>]\s*[^\n]+/g,
  'env-var': /\$[A-Z_][A-Z0-9_]*|\b[A-Z_][A-Z0-9_]*=[^\s]+/g,
  'api-placeholder': /\b(?:sk|pk|api|token|key)_[A-Za-z0-9_-]{8,}\b/gi,
  'number-unit': /\b\d+(?:\.\d+)?\s?(?:ms|s|sec|min|h|hr|day|days|kb|mb|gb|tb|%|x)\b/gi,
  'json-block': /```json[\s\S]*?```|\{[\s\S]*\}/g,
  'yaml-toml': /---[\s\S]*?---|(?:^|\n)\s*[A-Za-z0-9_.-]+\s*=\s*.+/g,
  'markdown-table': /(?:^|\n)\|.+\|\n\|[-:| ]+\|(?:\n\|.*\|)*/g,
  'markdown-heading': /^#{1,6}\s.+$/gm,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  'quoted-string': /"[^"\n]{3,}"|'[^'\n]{3,}'/g,
};

function createPlaceholder(index: number): string {
  return `\u241fTT_SPAN_${index}_\u241f`;
}

function collides(text: string, token: string): boolean {
  return text.includes(token);
}

export type ProtectedRun = {
  text: string;
  spans: ProtectedSpan[];
  stats: ProtectedSpanStats;
};

export function protectSpans(text: string, activeTypes: ProtectedSpanType[]): ProtectedRun {
  const stats = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0])) as ProtectedSpanStats;
  const spans: ProtectedSpan[] = [];
  let out = text;

  for (const type of activeTypes) {
    const pattern = PATTERNS[type];
    pattern.lastIndex = 0;
    out = out.replace(pattern, (content) => {
      let placeholder = createPlaceholder(spans.length);
      while (collides(text, placeholder) || collides(out, placeholder)) {
        placeholder = createPlaceholder(spans.length + Math.floor(Math.random() * 10000));
      }
      spans.push({ type, placeholder, content });
      stats[type] += 1;
      return placeholder;
    });
  }

  return { text: out, spans, stats };
}

export function restoreSpans(text: string, spans: ProtectedSpan[]): string {
  let out = text;
  for (const span of spans) {
    out = out.split(span.placeholder).join(span.content);
  }
  return out;
}
