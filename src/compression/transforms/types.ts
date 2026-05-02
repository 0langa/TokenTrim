import type {
  CompressionMode,
  CompressionProfile,
  RiskLevel,
  SafetyIssue,
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
  /** Categories of safety issues this transform intentionally produces and that should not cause rejection. */
  allowedSafetyCategories?: SafetyIssue['category'][];
};

export type TokenTrimTransform = {
  id: string;
  label: string;
  description?: string;
  risk: RiskLevel;
  defaultModes: CompressionMode[];
  profiles?: CompressionProfile[];
  profileOnly?: boolean;
  apply: (input: string, ctx: TransformContext) => TransformResult;
};
