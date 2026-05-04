import type { ProtectedSpan, ProtectedSpanStats, ProtectedSpanType } from './types';

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  'fbclid', 'gclid', 'dclid', 'msclkid', 'twclid', 'li_fat_id',
  'wickedid', 'igshid', 'mc_cid', 'mc_eid', 'mkt_tok',
  'ref', 'referrer', 'referral', 'source', 'medium',
];

function stripUrlParams(url: string): string {
  try {
    const u = new URL(url);
    let changed = false;
    for (const param of TRACKING_PARAMS) {
      if (u.searchParams.has(param)) {
        u.searchParams.delete(param);
        changed = true;
      }
    }
    // Clean empty search
    if (changed && u.search === '') {
      return u.toString().replace(/\?$/, '');
    }
    return changed ? u.toString() : url;
  } catch {
    // Fallback: simple regex stripping for malformed URLs
    let cleaned = url;
    for (const param of TRACKING_PARAMS) {
      cleaned = cleaned.replace(new RegExp(`[?&]${param}=[^&]*`, 'gi'), '');
    }
    cleaned = cleaned.replace(/\?&/g, '?').replace(/&&/g, '&');
    return cleaned;
  }
}

const PATTERNS: Record<ProtectedSpanType, RegExp> = {
  'fenced-code': /```[\s\S]*?```/g,
  'inline-code': /`[^`\n]+`/g,
  url: /https?:\/\/[^\s)\]>"']+/g,
  'file-path': /\b(?:[A-Za-z]:\\[^\s]+|(?:\.\.?\/)?(?:[\w.-]+\/)+[\w.-]+)\b/g,
  'cli-command': /(?:^|\n)\s*(?:\$\s+|>\s+)[^\n]+/g,
  'env-var': /\$[A-Z_][A-Z0-9_]*|\b[A-Z_][A-Z0-9_]*=[^\s]+/g,
  'api-placeholder': /\b(?:sk|pk|api|token|key)_[A-Za-z0-9_-]{8,}\b/gi,
  'number-unit': /\b\d+(?:\.\d+)?\s?(?:ms|s|sec|min|h|hr|day|days|kb|mb|gb|tb|%|x)\b/gi,
  'json-block': /```json[\s\S]*?```/gi,
  'yaml-toml': /```(?:ya?ml|toml)[\s\S]*?```/gi,
  'markdown-table': /(?:^|\n)\|.+\|\n\|[-:| ]+\|(?:\n\|.*\|)*/g,
  'markdown-heading': /^#{1,6}\s.+$/gm,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g,
  'quoted-string': /"[^"\n]{3,}"|'[^'\n]{3,}'/g,
};

function createPlaceholder(seed: string, index: number): string {
  return `\u241fTT_SPAN_${seed}_${index.toString(36)}\u241f`;
}

function computeSeed(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < Math.min(text.length, 2000); i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash).toString(36);
}

export type ProtectedRun = {
  text: string;
  spans: ProtectedSpan[];
  stats: ProtectedSpanStats;
};

export function protectSpans(text: string, activeTypes: ProtectedSpanType[]): ProtectedRun {
  const stats = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0])) as ProtectedSpanStats;
  const spans: ProtectedSpan[] = [];
  const seed = computeSeed(text);
  let out = text;

  for (const type of activeTypes) {
    const pattern = PATTERNS[type];
    pattern.lastIndex = 0;
    out = out.replace(pattern, (content) => {
      let placeholder = createPlaceholder(seed, spans.length);
      let salt = 0;
      while ((text.includes(placeholder) || out.includes(placeholder)) && salt < 1000) {
        salt += 1;
        placeholder = createPlaceholder(seed + salt.toString(36), spans.length);
      }
      // Strip tracking params from URLs before storing
      const storedContent = type === 'url' ? stripUrlParams(content) : content;
      spans.push({ type, placeholder, content: storedContent });
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
