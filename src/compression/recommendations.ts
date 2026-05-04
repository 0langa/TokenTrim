import type { CompressionMode, CompressionProfile } from './types';

export interface CompressionRecommendation {
  profile: CompressionProfile;
  mode: CompressionMode;
  reason: string;
}

export const FILE_EXTENSION_PROFILE_MAP: Record<string, CompressionProfile> = {
  md: 'markdown-docs',
  mdx: 'markdown-docs',
  rst: 'markdown-docs',
  log: 'logs',
  out: 'logs',
  err: 'logs',
  csv: 'csv',
  tsv: 'csv',
  jsonl: 'jsonl',
  ndjson: 'jsonl',
  xml: 'xml',
  svg: 'xml',
  html: 'xml',
  htm: 'xml',
  ts: 'repo-context',
  tsx: 'repo-context',
  js: 'repo-context',
  jsx: 'repo-context',
  py: 'repo-context',
  java: 'repo-context',
  go: 'repo-context',
  rs: 'repo-context',
  css: 'repo-context',
  scss: 'repo-context',
  json: 'repo-context',
  yaml: 'repo-context',
  yml: 'repo-context',
  toml: 'repo-context',
  sh: 'repo-context',
  bash: 'repo-context',
  zsh: 'repo-context',
};

const RECOMMENDATION_BY_PROFILE: Record<CompressionProfile, CompressionRecommendation> = {
  general: {
    profile: 'general',
    mode: 'normal',
    reason: 'Balanced default for mixed text.',
  },
  'agent-context': {
    profile: 'agent-context',
    mode: 'normal',
    reason: 'Instruction-heavy text detected. Preserve requirements and negations.',
  },
  'repo-context': {
    profile: 'repo-context',
    mode: 'heavy',
    reason: 'Code or project context detected. Strong cleanup works well here.',
  },
  logs: {
    profile: 'logs',
    mode: 'heavy',
    reason: 'Repeated log/error patterns detected. Strong cleanup removes noise fast.',
  },
  'markdown-docs': {
    profile: 'markdown-docs',
    mode: 'normal',
    reason: 'Markdown structure detected. Keep headings and code blocks intact.',
  },
  'chat-history': {
    profile: 'chat-history',
    mode: 'normal',
    reason: 'Conversation-style text detected. Remove filler, keep decisions.',
  },
  csv: {
    profile: 'csv',
    mode: 'light',
    reason: 'Tabular data detected. Use light cleanup to avoid reshaping values.',
  },
  jsonl: {
    profile: 'jsonl',
    mode: 'light',
    reason: 'Line-delimited JSON detected. Structural cleanup is safest.',
  },
  xml: {
    profile: 'xml',
    mode: 'light',
    reason: 'Markup detected. Structural cleanup preserves tag integrity.',
  },
};

function getExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? '';
}

export function getRecommendationForFilename(filename: string): CompressionRecommendation | null {
  const profile = FILE_EXTENSION_PROFILE_MAP[getExtension(filename)];
  return profile ? RECOMMENDATION_BY_PROFILE[profile] : null;
}

export function getRecommendationForText(text: string): CompressionRecommendation | null {
  const input = text.trim();
  if (!input) {
    return null;
  }

  if (/^\s*(?:\[|\{)[\s\S]*(?:\]|\})\s*$/m.test(input) && /}\s*\n\s*{/m.test(input)) {
    return RECOMMENDATION_BY_PROFILE.jsonl;
  }

  if (/^\s*[\w-]+,\s*[\w-]+/m.test(input) || /^\s*[^,\n]+\t[^,\n]+/m.test(input)) {
    return RECOMMENDATION_BY_PROFILE.csv;
  }

  if (/<[a-zA-Z][\w:-]*[\s>]/.test(input) && /<\/[a-zA-Z][\w:-]*>/.test(input)) {
    return RECOMMENDATION_BY_PROFILE.xml;
  }

  if (
    /^#{1,6}\s/m.test(input) ||
    /```/.test(input) ||
    /^\s*[-*]\s/m.test(input) ||
    /\[[^\]]+\]\([^)]+\)/.test(input)
  ) {
    return RECOMMENDATION_BY_PROFILE['markdown-docs'];
  }

  if (
    /(^|\n)\s*(ERROR|WARN|INFO|DEBUG|TRACE)\b/.test(input) ||
    /\bException\b/.test(input) ||
    /\bat\s+\S+\s+\(.+:\d+:\d+\)/.test(input) ||
    /\bHTTP\/\d\.\d"\s+\d{3}\b/.test(input)
  ) {
    return RECOMMENDATION_BY_PROFILE.logs;
  }

  if (
    /\b(import |export |class |interface |function |const |let |var )/.test(input) ||
    /\bdef\s+\w+\(/.test(input) ||
    /#include\s+[<"]/.test(input) ||
    /\bpublic\s+class\b/.test(input)
  ) {
    return RECOMMENDATION_BY_PROFILE['repo-context'];
  }

  if (
    /(^|\n)\s*(system:|user:|assistant:)/i.test(input) ||
    /\b(you are|must|should|return only|do not|preserve)\b/i.test(input)
  ) {
    return RECOMMENDATION_BY_PROFILE['agent-context'];
  }

  if (
    /(^|\n)\s*[A-Z][a-z]+:\s/.test(input) ||
    /\b(action items?|decision|next steps?)\b/i.test(input)
  ) {
    return RECOMMENDATION_BY_PROFILE['chat-history'];
  }

  return null;
}
