// NOTE: defaultModes must stay in sync with shouldRun() in pipeline.ts
import type { CompressionMode, RiskLevel } from './types';

export type TransformMeta = {
  id: string;
  label: string;
  description: string;
  risk: RiskLevel;
  defaultModes: CompressionMode[];
};

export const TRANSFORM_REGISTRY: TransformMeta[] = [
  {
    id: 'structured-data',
    label: 'JSON Minification',
    description: 'Minifies JSON blocks losslessly (removes whitespace/indentation)',
    risk: 'safe',
    defaultModes: ['light', 'normal', 'heavy', 'ultra'],
  },
  {
    id: 'filler-removal',
    label: 'Filler Phrase Removal',
    description: 'Removes hedging phrases like "please note", "I believe", "basically"',
    risk: 'medium',
    defaultModes: ['normal', 'heavy', 'ultra'],
  },
  {
    id: 'numeric',
    label: 'Numeric Normalization',
    description: 'Converts written numbers to digits (fifty → 50, 5 million → 5M)',
    risk: 'low',
    defaultModes: ['normal', 'heavy', 'ultra'],
  },
  {
    id: 'prose-rewrite:common',
    label: 'Common Prose Rewrites',
    description: 'Condenses verbose constructions (in order to → to, due to the fact that → because)',
    risk: 'medium',
    defaultModes: ['normal', 'heavy', 'ultra'],
  },
  {
    id: 'article-removal',
    label: 'Article Removal',
    description: 'Drops "the", "a", "an" before prose words',
    risk: 'medium',
    defaultModes: ['heavy', 'ultra'],
  },
  {
    id: 'abbreviation',
    label: 'Abbreviation',
    description: 'Replaces long technical terms with abbreviations (authentication → auth, database → DB)',
    risk: 'low',
    defaultModes: ['heavy', 'ultra'],
  },
  {
    id: 'operator',
    label: 'Operator Substitution',
    description: 'Replaces words with symbols in prose (and → &, with → w/, because → bc)',
    risk: 'high',
    defaultModes: ['heavy', 'ultra'],
  },
  {
    id: 'caveman-compaction',
    label: 'Caveman Compaction',
    description: 'Aggressively removes articles, prepositions, helper verbs, and filler words',
    risk: 'high',
    defaultModes: ['heavy', 'ultra'],
  },
  {
    id: 'deduplication',
    label: 'Paragraph Deduplication',
    description: 'Removes repeated paragraph blocks, replaces with [duplicate removed]',
    risk: 'medium',
    defaultModes: ['heavy', 'ultra'],
  },
];

export function getAllTransformIds(): string[] {
  return TRANSFORM_REGISTRY.map((t) => t.id);
}
