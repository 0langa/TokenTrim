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
    description: 'Safe structural cleanup with minimal wording changes.',
    guidance: 'Best readability; use when precision is critical.',
    expectedSavingsPct: [10, 22],
    risk: 'safe',
  },
  {
    id: 'normal',
    label: 'Normal',
    description: 'Balanced compression with clear, concise rewriting.',
    guidance: 'Best default for prompt engineering contexts.',
    expectedSavingsPct: [25, 42],
    risk: 'low',
  },
  {
    id: 'heavy',
    label: 'Heavy',
    description: 'Aggressive syntax compression and symbolization.',
    guidance: 'Higher savings with moderate readability tradeoff.',
    expectedSavingsPct: [38, 55],
    risk: 'medium',
  },
  {
    id: 'ultra',
    label: 'Ultra',
    description: 'Maximum caveman-style telegraphic compression.',
    guidance: 'Maximum compression, readability reduced.',
    expectedSavingsPct: [45, 65],
    risk: 'high',
    advanced: true,
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Choose exactly which transforms to apply.',
    guidance: 'Full control — mix and match any combination.',
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
