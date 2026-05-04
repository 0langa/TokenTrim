import type { CompressionMode, CompressionModeMeta, ProtectedSpanType } from './types';

export const ALL_PROTECTED_SPANS: ProtectedSpanType[] = [
  'json-block',
  'yaml-toml',
  'fenced-code',
  'inline-code',
  'url',
  'file-path',
  'cli-command',
  'env-var',
  'api-placeholder',
  'number-unit',
  'markdown-table',
  'markdown-heading',
  'email',
  'quoted-string',
];

export const MODES: CompressionModeMeta[] = [
  {
    id: 'light',
    label: 'Light',
    description: 'Gentle cleanup with almost no wording risk.',
    guidance: 'Best when you want easier reading and only modest savings.',
    expectedSavingsPct: [10, 22],
    risk: 'safe',
  },
  {
    id: 'normal',
    label: 'Normal',
    description: 'Balanced cleanup for most everyday text.',
    guidance: 'Best starting point when you are unsure.',
    expectedSavingsPct: [25, 42],
    risk: 'low',
  },
  {
    id: 'heavy',
    label: 'Heavy',
    description: 'Stronger compression with more aggressive shortening.',
    guidance: 'Good for logs, code context, and long working drafts.',
    expectedSavingsPct: [38, 55],
    risk: 'medium',
  },
  {
    id: 'ultra',
    label: 'Ultra',
    description: 'Maximum compression with obvious readability tradeoff.',
    guidance: 'Use only when saving tokens matters more than natural wording.',
    expectedSavingsPct: [45, 65],
    risk: 'high',
    advanced: true,
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Manual control over individual transforms.',
    guidance: 'Best for advanced tuning or experiments.',
    expectedSavingsPct: [0, 65],
    risk: 'high',
    advanced: true,
  },
];

export function listModes(): CompressionModeMeta[] {
  return MODES;
}

export function getModeMeta(mode: CompressionMode): CompressionModeMeta {
  return MODES.find((m) => m.id === mode) ?? MODES[1];
}

export function mapLegacyProfileToMode(profileId?: string): CompressionMode {
  if (!profileId) return 'normal';
  const map: Record<string, CompressionMode> = {
    'lossless-light': 'light',
    'lossless-dict': 'normal',
    'lossy-prose': 'normal',
    'docs-readme': 'normal',
    'meeting-notes': 'normal',
    'codebase-context': 'heavy',
    'chat-history': 'heavy',
    'lossy-agent': 'ultra',
    'research-notes': 'light',
    spec: 'light',
  };
  return map[profileId] ?? 'normal';
}
