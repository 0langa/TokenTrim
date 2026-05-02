export type CompressionMode = 'light' | 'normal' | 'heavy' | 'ultra' | 'custom';
export type CompressionProfile =
  | 'general'
  | 'agent-context'
  | 'repo-context'
  | 'logs'
  | 'markdown-docs'
  | 'chat-history';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high';

export type TransformExample = { before: string; after: string };

export type TransformStat = {
  transformId: string;
  replacements: number;
  charsSaved: number;
  risk: RiskLevel;
  examples: TransformExample[];
};

export type ProtectedSpanType =
  | 'fenced-code'
  | 'inline-code'
  | 'url'
  | 'file-path'
  | 'cli-command'
  | 'env-var'
  | 'api-placeholder'
  | 'number-unit'
  | 'json-block'
  | 'yaml-toml'
  | 'markdown-table'
  | 'markdown-heading'
  | 'email'
  | 'quoted-string';

export type ProtectedSpan = {
  type: ProtectedSpanType;
  placeholder: string;
  content: string;
};

export type ProtectedSpanStats = Record<ProtectedSpanType, number>;

export type RiskEvent = {
  transformId: string;
  category:
    | 'safe-structural-cleanup'
    | 'wording-change'
    | 'technical-term-adjacent-change'
    | 'possible-meaning-change';
  before: string;
  after: string;
};

export type SafetyIssue = {
  severity: 'warning' | 'error';
  category:
    | 'negation-loss'
    | 'requirement-loss'
    | 'number-loss'
    | 'date-loss'
    | 'semver-loss'
    | 'url-loss'
    | 'path-loss'
    | 'code-identifier-loss'
    | 'protected-span-loss';
  before: string;
  after?: string;
  message: string;
};

export type CompressionReport = {
  transformStats: TransformStat[];
  removedPhrases: Array<{ before: string; after?: string }>;
  replacedPhrases: Array<{ before: string; after: string }>;
  abbreviationHits: number;
  operatorHits: number;
  protectedSpanStats: ProtectedSpanStats;
  riskEvents: RiskEvent[];
  diffPreview: Array<{ kind: 'remove' | 'replace'; before: string; after?: string }>;
};

export type TokenizerKind = 'approx-generic' | 'openai-cl100k' | 'openai-o200k';

export type TokenEstimate = {
  tokenizer: TokenizerKind;
  tokens: number;
  exact: boolean;
};

export type CompressionMetrics = {
  originalChars: number;
  outputChars: number;
  charSavings: number;
  originalWords: number;
  outputWords: number;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  estimatedTokenSavings: number;
  tokenizerUsed: TokenizerKind;
  tokenizerExact: boolean;
};

export type CompressionResult = {
  output: string;
  mode: CompressionMode;
  profile?: CompressionProfile;
  metrics: CompressionMetrics;
  report: CompressionReport;
  warnings: string[];
  safetyIssues: SafetyIssue[];
  rejectedTransforms: string[];
  targetTokens?: number;
  budgetReached?: boolean;
  error?: string;
};

export type CompressionOptions = {
  mode?: CompressionMode;
  profile?: CompressionProfile;
  profileId?: string;
  tokenizer?: TokenizerKind;
  enabledTransforms?: string[];
  targetTokens?: number;
  maxRisk?: RiskLevel;
};

export type CompressionRequest = {
  text: string;
  options: CompressionOptions;
};

export type CompressionModeMeta = {
  id: CompressionMode;
  label: 'Light' | 'Normal' | 'Heavy' | 'Ultra' | 'Custom';
  description: string;
  guidance: string;
  expectedSavingsPct: [number, number];
  risk: RiskLevel;
  advanced?: boolean;
};

export type CompressionExportReport = {
  version: string;
  input: { chars: number; tokens: number };
  output: { chars: number; tokens: number };
  savings: { chars: number; tokens: number; tokenPercent: number };
  tokenizer: TokenizerKind;
  tokenizerExact: boolean;
  mode: CompressionMode;
  profile?: CompressionProfile;
  targetTokens?: number;
  budgetReached?: boolean;
  transforms: TransformStat[];
  safetyIssues: SafetyIssue[];
  rejectedTransforms: string[];
  warnings: string[];
};
