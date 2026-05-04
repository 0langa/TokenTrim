import type { CompressionProfile } from './types';

export type ProfileMeta = {
  label: string;
  description: string;
  inputType: string;
};

export const PROFILE_META: Record<CompressionProfile, ProfileMeta> = {
  general: {
    label: 'General Text',
    description: 'All-purpose compression for mixed content. Applies prose rewriting, filler removal, numeric normalization, and structural cleanup.',
    inputType: 'Emails, documents, plain prose, any mixed text',
  },
  'agent-context': {
    label: 'Prompt / Agent Context',
    description: 'Optimized for AI prompts and instructions. Preserves negations, requirements, and semantic precision while removing structural noise.',
    inputType: 'AI system prompts, agent instructions, task context',
  },
  'repo-context': {
    label: 'Repo Context',
    description: 'Compresses source files and documentation for packing into agent context windows. Preserves code structure, removes markdown boilerplate.',
    inputType: 'Source code files, README files, codebases',
  },
  logs: {
    label: 'Logs / Error Output',
    description: 'Collapses repeated log lines into counts, preserves unique errors and stack traces, normalizes numeric values.',
    inputType: 'Application logs, error output, terminal output',
  },
  'markdown-docs': {
    label: 'Markdown Docs',
    description: 'Cleans and normalizes markdown while preserving headings, code blocks, and document structure. Removes redundant content sections.',
    inputType: 'Markdown files, documentation, wiki pages',
  },
  'chat-history': {
    label: 'Chat / Meeting Notes',
    description: 'Removes low-value conversational filler and deduplicates repeated points. Preserves decisions, action items, and factual content.',
    inputType: 'Chat transcripts, meeting notes, conversation logs',
  },
  csv: {
    label: 'CSV / TSV',
    description: 'Collapses repeated rows, normalizes whitespace around delimiters, and removes blank lines in tabular data.',
    inputType: 'CSV files, TSV files, tabular data exports',
  },
  jsonl: {
    label: 'JSONL / NDJSON',
    description: 'Minifies each JSON line independently and removes trailing commas. Preserves all keys and values.',
    inputType: 'JSON Lines, NDJSON streams, log files',
  },
  xml: {
    label: 'XML / HTML',
    description: 'Removes comments, collapses whitespace in attributes, normalizes entities, and strips empty lines between tags.',
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
