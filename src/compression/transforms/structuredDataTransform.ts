import type { RiskLevel, TransformStat, TransformExample } from '../types';

export function structuredDataTransform(input: string): {
  output: string;
  stat: TransformStat;
  examples: TransformExample[];
} {
  const risk: RiskLevel = 'safe';
  const noOp = {
    output: input,
    examples: [] as TransformExample[],
    stat: { transformId: 'structured-data', replacements: 0, charsSaved: 0, risk, examples: [] as TransformExample[] },
  };

  const trimmed = input.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return noOp;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return noOp;
  }

  const minified = JSON.stringify(parsed);
  if (minified.length >= input.length) return noOp;

  const charsSaved = input.length - minified.length;
  const examples: TransformExample[] = [{ before: input.slice(0, 80), after: minified.slice(0, 80) }];

  return {
    output: minified,
    examples,
    stat: { transformId: 'structured-data', replacements: 1, charsSaved, risk, examples },
  };
}
