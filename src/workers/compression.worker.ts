import { compress, decompress } from '../compression/pipeline';
import type { CompressionLegend, CompressionRequest } from '../compression/types';

type WorkerRequest =
  | { kind: 'compress'; payload: CompressionRequest }
  | { kind: 'decompress'; payload: { text: string; legend: CompressionLegend | Record<string, string> } };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  if (e.data.kind === 'compress') {
    const { text, options } = e.data.payload;
    self.postMessage({ kind: 'compress', result: compress(text, options) });
    return;
  }

  if (e.data.kind === 'decompress') {
    try {
      const output = decompress(e.data.payload.text, e.data.payload.legend);
      self.postMessage({ kind: 'decompress', result: { output, error: null } });
    } catch (error) {
      self.postMessage({
        kind: 'decompress',
        result: { output: e.data.payload.text, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }
};
