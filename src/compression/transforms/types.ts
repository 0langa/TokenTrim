import type {
  CompressionMode,
  CompressionProfile,
  RiskLevel,
  TokenizerKind,
  TransformStat,
} from '../types';

export type TransformContext = {
  mode: CompressionMode;
  profile?: CompressionProfile;
  tokenizer: TokenizerKind;
  targetTokens?: number;
  maxRisk?: RiskLevel;
};

export type TransformResult = {
  output: string;
  stat: TransformStat;
};

export type TokenTrimTransform = {
  id: string;
  label: string;
  description?: string;
  risk: RiskLevel;
  defaultModes: CompressionMode[];
  profiles?: CompressionProfile[];
  apply: (input: string, ctx: TransformContext) => TransformResult;
};
