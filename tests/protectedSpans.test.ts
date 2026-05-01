import { describe, expect, it } from 'vitest';
import { protectSpans, restoreSpans } from '../src/compression/protectedSpans';

describe('protected spans', () => {
  it('protects and restores representative span types', () => {
    const input = `# Heading\n\n|a|b|\n|-|-|\n|1|2|\n\n\`inline\`\n\n\`\`\`ts\nconst x=1\n\`\`\`\n\nhttps://example.com\nC:/tmp/file.ts\n$ npm run build\n$API_KEY\nTOKEN_abc12345678\n20ms\nuser@example.com\n"quoted value"`;
    const run = protectSpans(input, [
      'markdown-heading','markdown-table','inline-code','fenced-code','url','file-path','cli-command','env-var','api-placeholder','number-unit','email','quoted-string',
    ]);
    expect(run.text).not.toContain('https://example.com');
    const restored = restoreSpans(run.text, run.spans);
    expect(restored).toBe(input);
    expect(run.stats['inline-code']).toBeGreaterThan(0);
  });
});
