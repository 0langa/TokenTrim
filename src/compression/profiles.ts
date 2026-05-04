import type { CompressionProfile } from './types';

export type ProfileMeta = {
  label: string;
  description: string;
  inputType: string;
};

export const COMMON_WEB_PROFILES: CompressionProfile[] = [
  'general',
  'agent-context',
  'repo-context',
  'logs',
  'markdown-docs',
  'chat-history',
];

export const PROFILE_META: Record<CompressionProfile, ProfileMeta> = {
  general: {
    label: 'General text',
    description: 'Best default for everyday writing. Keeps wording clear while trimming filler and repetition.',
    inputType: 'Emails, notes, plain text, mixed content',
  },
  'agent-context': {
    label: 'Prompt or instructions',
    description: 'For prompts, rules, and task instructions. Extra careful with requirements, negations, and exact wording.',
    inputType: 'Prompts, instructions, task briefs',
  },
  'repo-context': {
    label: 'Code or project files',
    description: 'For code, READMEs, and repo context. Keeps structure and technical detail while cutting noise.',
    inputType: 'Code files, READMEs, project context',
  },
  logs: {
    label: 'Logs or errors',
    description: 'For logs and terminal output. Groups repeated lines and keeps unique failures visible.',
    inputType: 'Logs, stack traces, terminal output',
  },
  'markdown-docs': {
    label: 'Docs or markdown',
    description: 'For markdown docs. Keeps headings, lists, and code blocks while trimming repeated sections.',
    inputType: 'Markdown docs, guides, wiki pages',
  },
  'chat-history': {
    label: 'Chat or notes',
    description: 'For chat history and meeting notes. Removes filler but keeps decisions, actions, and facts.',
    inputType: 'Chat transcripts, meeting notes, conversations',
  },
  csv: {
    label: 'CSV or TSV',
    description: 'For table exports. Cleans spacing and repeated rows without rewriting values.',
    inputType: 'CSV files, TSV files, tabular data exports',
  },
  jsonl: {
    label: 'JSONL or NDJSON',
    description: 'For line-delimited JSON. Structural cleanup only; values stay unchanged.',
    inputType: 'JSON Lines, NDJSON streams, log files',
  },
  xml: {
    label: 'XML or HTML',
    description: 'For markup files. Preserves tags while removing comments and extra whitespace.',
    inputType: 'XML files, HTML files, SVG markup',
  },
};

export const PROFILE_TRANSFORM_ORDER: Record<CompressionProfile, string[]> = {
  general: [
    'markdown-cleanup',
    'structured-data',
    'punctuation',
    'prose-rewrite:common',
    'filler-removal',
    'contraction',
    'synonym',
    'pleonasm',
    'repeated-word',
    'number-range',
    'time-duration',
    'numeric',
    'article-removal',
    'abbreviation',
    'operator',
    'deduplication',
  ],
  'agent-context': [
    'markdown-cleanup',
    'punctuation',
    'prose-rewrite:common',
    'filler-removal',
    'contraction',
    'synonym',
    'pleonasm',
    'repeated-word',
    'number-range',
    'time-duration',
    'numeric',
    'section-salience',
    'deduplication',
    'abbreviation',
    'operator',
  ],
  'repo-context': [
    'markdown-cleanup',
    'structured-data',
    'punctuation',
    'prose-rewrite:common',
    'filler-removal',
    'contraction',
    'synonym',
    'pleonasm',
    'repeated-word',
    'section-salience',
    'abbreviation',
    'deduplication',
  ],
  logs: [
    'log-compression',
    'punctuation',
    'numeric',
    'number-range',
    'time-duration',
    'deduplication',
  ],
  'markdown-docs': [
    'markdown-cleanup',
    'structured-data',
    'punctuation',
    'prose-rewrite:common',
    'filler-removal',
    'contraction',
    'synonym',
    'pleonasm',
    'repeated-word',
    'number-range',
    'time-duration',
    'numeric',
    'section-salience',
    'deduplication',
  ],
  'chat-history': [
    'section-salience',
    'punctuation',
    'prose-rewrite:common',
    'filler-removal',
    'contraction',
    'synonym',
    'pleonasm',
    'repeated-word',
    'number-range',
    'time-duration',
    'numeric',
    'deduplication',
    'abbreviation',
  ],
  csv: ['csv-cleanup', 'deduplication'],
  jsonl: ['jsonl-minify', 'deduplication'],
  xml: ['xml-cleanup', 'deduplication'],
};

export function listProfiles(): CompressionProfile[] {
  return Object.keys(PROFILE_TRANSFORM_ORDER) as CompressionProfile[];
}

export function mapLegacyProfileId(profileId?: string): CompressionProfile | undefined {
  if (!profileId) return undefined;
  const map: Record<string, CompressionProfile> = {
    'docs-readme': 'markdown-docs',
    'meeting-notes': 'chat-history',
    'codebase-context': 'repo-context',
    'chat-history': 'chat-history',
    'lossy-agent': 'agent-context',
    'lossy-prose': 'general',
    'research-notes': 'markdown-docs',
    spec: 'markdown-docs',
    'lossless-light': 'general',
    'lossless-dict': 'general',
  };
  return map[profileId];
}
