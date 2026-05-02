import type { CompressionMode, CompressionProfile, RiskLevel } from './types';

export type Preset = {
  id: string;
  label: string;
  description: string;
  profile: CompressionProfile;
  mode: CompressionMode;
  maxRisk: RiskLevel;
};

export const PRESETS: Preset[] = [
  {
    id: 'prompt',
    label: 'Prompt / Agent Instructions',
    description: 'Compress AI prompts and agent context while preserving requirements and negations',
    profile: 'agent-context',
    mode: 'normal',
    maxRisk: 'medium',
  },
  {
    id: 'logs',
    label: 'Logs / Error Output',
    description: 'Collapse repeated log lines and preserve unique errors, warnings, and stack traces',
    profile: 'logs',
    mode: 'heavy',
    maxRisk: 'medium',
  },
  {
    id: 'repo',
    label: 'Repo Context',
    description: 'Compress source files and documentation for agent context packs',
    profile: 'repo-context',
    mode: 'heavy',
    maxRisk: 'medium',
  },
  {
    id: 'docs',
    label: 'Markdown Docs',
    description: 'Clean and compress markdown documentation while preserving structure',
    profile: 'markdown-docs',
    mode: 'normal',
    maxRisk: 'medium',
  },
  {
    id: 'chat',
    label: 'Chat History',
    description: 'Compress conversation history and meeting notes',
    profile: 'chat-history',
    mode: 'heavy',
    maxRisk: 'medium',
  },
  {
    id: 'generic',
    label: 'Generic Text',
    description: 'General-purpose compression for any text content',
    profile: 'general',
    mode: 'normal',
    maxRisk: 'medium',
  },
];

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
