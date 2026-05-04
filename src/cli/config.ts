import fs from 'node:fs';
import path from 'node:path';
import type { CompressionMode, CompressionProfile, RiskLevel, TokenizerKind } from '../compression/types';

export type CliConfig = {
  mode?: CompressionMode;
  profile?: CompressionProfile;
  tokenizer?: TokenizerKind;
  maxRisk?: RiskLevel;
  targetTokens?: number;
  enabledTransforms?: string[];
  protectPatterns?: string[];
  requiredPhrases?: string[];
};

const CONFIG_FILENAMES = ['.tokentrimrc', '.tokentrimrc.json', 'tokentrim.config.json'];

const VALID_MODES: CompressionMode[] = ['light', 'normal', 'heavy', 'ultra', 'custom'];
const VALID_PROFILES: CompressionProfile[] = ['general', 'agent-context', 'repo-context', 'logs', 'markdown-docs', 'chat-history'];
const VALID_TOKENIZERS: TokenizerKind[] = ['approx-generic', 'openai-cl100k', 'openai-o200k'];
const VALID_RISKS: RiskLevel[] = ['safe', 'low', 'medium', 'high'];

function validateString<T extends string>(value: unknown, valid: T[], field: string): T {
  if (!valid.includes(value as T)) {
    throw new Error(`Invalid ${field} in config: "${value}". Allowed: ${valid.join(', ')}`);
  }
  return value as T;
}

function validateConfig(raw: unknown): CliConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Config must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;
  const cfg: CliConfig = {};

  if (obj.mode !== undefined) cfg.mode = validateString(obj.mode, VALID_MODES, 'mode');
  if (obj.profile !== undefined) cfg.profile = validateString(obj.profile, VALID_PROFILES, 'profile');
  if (obj.tokenizer !== undefined) cfg.tokenizer = validateString(obj.tokenizer, VALID_TOKENIZERS, 'tokenizer');
  if (obj.maxRisk !== undefined) cfg.maxRisk = validateString(obj.maxRisk, VALID_RISKS, 'maxRisk');

  if (obj.targetTokens !== undefined) {
    const n = Number(obj.targetTokens);
    if (!Number.isInteger(n) || n <= 0) throw new Error('Config targetTokens must be a positive integer');
    cfg.targetTokens = n;
  }

  if (obj.enabledTransforms !== undefined) {
    if (!Array.isArray(obj.enabledTransforms) || !obj.enabledTransforms.every((x) => typeof x === 'string')) {
      throw new Error('Config enabledTransforms must be an array of strings');
    }
    cfg.enabledTransforms = obj.enabledTransforms as string[];
  }

  if (obj.protectPatterns !== undefined) {
    if (!Array.isArray(obj.protectPatterns) || !obj.protectPatterns.every((x) => typeof x === 'string')) {
      throw new Error('Config protectPatterns must be an array of strings');
    }
    cfg.protectPatterns = obj.protectPatterns as string[];
  }

  if (obj.requiredPhrases !== undefined) {
    if (!Array.isArray(obj.requiredPhrases) || !obj.requiredPhrases.every((x) => typeof x === 'string')) {
      throw new Error('Config requiredPhrases must be an array of strings');
    }
    cfg.requiredPhrases = obj.requiredPhrases as string[];
  }

  return cfg;
}

export function loadConfig(cwd: string = process.cwd()): CliConfig {
  for (const name of CONFIG_FILENAMES) {
    const p = path.join(cwd, name);
    if (fs.existsSync(p)) {
      let raw: unknown;
      try {
        raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch {
        throw new Error(`Failed to parse config file ${name}: invalid JSON`);
      }
      return validateConfig(raw);
    }
  }
  return {};
}

export const STARTER_CONFIG: CliConfig = {
  mode: 'normal',
  profile: 'general',
  tokenizer: 'approx-generic',
  maxRisk: 'medium',
};

export const CONFIG_FILENAMES_EXPORT = CONFIG_FILENAMES;
