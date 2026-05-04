import { compress } from '../compression/pipeline';
import type { CompressionRequest } from '../compression/types';
import { loadExactTokenizer } from '../compression/tokenizers/exactTokenizer';

self.onmessage = async (e: MessageEvent<CompressionRequest>) => {
  const { text, options } = e.data;
  if (options.tokenizer && options.tokenizer !== 'approx-generic') {
    await loadExactTokenizer(options.tokenizer);
  }
  self.postMessage(compress(text, options));
};
