import { compress } from '../compression/pipeline';
import type { CompressionRequest } from '../compression/types';

self.onmessage = (e: MessageEvent<CompressionRequest>) => {
  const { text, intensity } = e.data;
  const result = compress(text, intensity);
  self.postMessage(result);
};
