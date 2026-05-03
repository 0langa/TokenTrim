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
};

export const PROFILE_TRANSFORM_ORDER: Record<CompressionProfile, string[]> = {
  general: ['structured-data', 'filler-removal', 'numeric', 'prose-rewrite:common', 'article-removal', 'abbreviation', 'operator', 'deduplication'],
  'agent-context': ['markdown-cleanup', 'section-salience', 'deduplication', 'abbreviation', 'operator'],
  'repo-context': ['markdown-cleanup', 'section-salience', 'abbreviation', 'deduplication'],
  logs: ['log-compression', 'numeric', 'deduplication'],
  'markdown-docs': ['markdown-cleanup', 'structured-data', 'section-salience', 'deduplication'],
  'chat-history': ['section-salience', 'filler-removal', 'deduplication', 'abbreviation'],
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
