import type { CompressionProfile } from './types';

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
