import { compress } from '../compression/pipeline';
import type { CompressionWorkerRequest, CompressionWorkerResponse } from '../compression/types';
import { loadExactTokenizer } from '../compression/tokenizers/exactTokenizer';

self.onmessage = async (e: MessageEvent<CompressionWorkerRequest>) => {
  const { requestId, text, options } = e.data;
  if (options.tokenizer && options.tokenizer !== 'approx-generic') {
    await loadExactTokenizer(options.tokenizer);
  }
  const response: CompressionWorkerResponse = {
    requestId,
    result: compress(text, options),
  };
  self.postMessage(response);
};
