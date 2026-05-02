export type CompressionMode = 'light' | 'normal' | 'heavy' | 'ultra' | 'custom';

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

export type CompressionReport = {
  transformStats: TransformStat[];
  removedPhrases: string[];
  replacedPhrases: Array<{ before: string; after: string }>;
  abbreviationHits: number;
  operatorHits: number;
  protectedSpanStats: ProtectedSpanStats;
  riskEvents: RiskEvent[];
  diffPreview: Array<{ kind: 'remove' | 'replace'; before: string; after?: string }>;
};

export type TokenizerKind = 'approx-generic';

export type TokenEstimate = {
  tokenizer: TokenizerKind;
  estimatedTokens: number;
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
};

export type CompressionResult = {
  output: string;
  mode: CompressionMode;
  metrics: CompressionMetrics;
  report: CompressionReport;
  warnings: string[];
  error?: string;
};

export type CompressionOptions = {
  mode?: CompressionMode;
  profileId?: string;
  tokenizer?: TokenizerKind;
  enabledTransforms?: string[]; // only used when mode === 'custom'
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
