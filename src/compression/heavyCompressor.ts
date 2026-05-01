import LZString from 'lz-string';
import { mediumCompress, mediumDecompress } from './mediumCompressor';

export interface HeavyResult {
  text: string;
  legend: Record<string, string>;
}

export function heavyCompress(raw: string): HeavyResult {
  const { text: medText, legend } = mediumCompress(raw);
  // Use compressToEncodedURIComponent — produces ASCII-safe output
  const compressed = LZString.compressToEncodedURIComponent(medText);
  return { text: compressed, legend };
}

export function heavyDecompress(text: string, legend: Record<string, string>): string {
  const medText = LZString.decompressFromEncodedURIComponent(text);
  if (medText === null) throw new Error('LZ decompression returned null');
  return mediumDecompress(medText, legend);
}
