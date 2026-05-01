export type Intensity = 'light' | 'medium' | 'heavy';

export interface CompressionResult {
  output: string;
  legend: Record<string, string> | null;
  originalChars: number;
  outputChars: number;
  originalWords: number;
  outputWords: number;
  ratio: number;
  passed: boolean;
  error?: string;
}

export interface CompressionRequest {
  text: string;
  intensity: Intensity;
}
