import { compress } from '../compression/pipeline';
import type { CompressionRequest } from '../compression/types';

self.onmessage = (e: MessageEvent<CompressionRequest>) => {
  const { text, options } = e.data;
  self.postMessage(compress(text, options));
};
