export type Guarantee =
  | 'exact-roundtrip'
  | 'normalized-roundtrip'
  | 'semantic-lossy'
  | 'none';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high';

export type ValidationKind =
  | 'exact-roundtrip'
  | 'normalized-roundtrip'
  | 'semantic-baseline'
  | 'lossy-no-roundtrip'
  | 'none';

export type CompressionProfile = {
  id: string;
  label: string;
  description: string;
  reversible: boolean;
  guarantee: Guarantee;
  risk: RiskLevel;
  requiresLegend: boolean;
  enabledTransforms: string[];
  protectedSpanTypes: ProtectedSpanType[];
  normalization?: 'none' | 'light-structural';
  audienceGuidance: string;
  expectedSavingsPct: [number, number];
  recommended: boolean;
  advanced?: boolean;
};

export type CompressionLegend = {
  version: number;
  profileId: string;
  reversible: boolean;
  tokenMap: Record<string, string>;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};

export type ValidationResult = {
  passed: boolean;
  validationKind: ValidationKind;
  baselineDescription: string;
  warnings: string[];
};

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
  dictionaryEntries: number;
  bpeEntries: number;
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
  legendOverhead: number;
  netCharSavingsIncludingLegend: number;
  tokenizerUsed: TokenizerKind;
};

export type CompressionResult = {
  output: string;
  legend: CompressionLegend | null;
  validation: ValidationResult;
  reversible: boolean;
  profileId: string;
  metrics: CompressionMetrics;
  report: CompressionReport;
  warnings: string[];
  error?: string;
};

export type CompressionOptions = {
  profileId: string;
  tokenizer?: TokenizerKind;
  customDictionary?: Record<string, string>;
  customProtectedRegexes?: string[];
};

export type CompressionRequest = {
  text: string;
  options: CompressionOptions;
};
