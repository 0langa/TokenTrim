let _encode: ((text: string) => number[]) | null = null;
let _loadedTokenizer: string | null = null;

export async function loadExactTokenizer(tokenizer: 'openai-cl100k' | 'openai-o200k'): Promise<void> {
  if (_encode && _loadedTokenizer === tokenizer) return;
  const mod = tokenizer === 'openai-o200k'
    ? await import('gpt-tokenizer/encoding/o200k_base')
    : await import('gpt-tokenizer/encoding/cl100k_base');
  _encode = mod.encode;
  _loadedTokenizer = tokenizer;
}

export function exactTokenCount(text: string): number | null {
  if (!_encode) return null;
  return _encode(text).length;
}
