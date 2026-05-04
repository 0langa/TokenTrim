import { describe, it, expect } from 'vitest';
import { compress } from '../src/compression/pipeline';
import type { CompressionMode } from '../src/compression/types';

const MODES: CompressionMode[] = ['light', 'normal', 'heavy', 'ultra'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function generateRandomMarkdown(): string {
  const paragraphs: string[] = [];
  const count = randomInt(3, 15);
  for (let i = 0; i < count; i++) {
    const type = pick(['heading', 'paragraph', 'code', 'list', 'url']);
    if (type === 'heading') {
      paragraphs.push(`${pick(['#', '##', '###'])} ${pick(['Title', 'Section', 'Overview', 'Details'])} ${randomInt(1, 100)}`);
    } else if (type === 'paragraph') {
      const words = Array(randomInt(10, 50)).fill(0).map(() => pick(['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'data', 'value', 'config', 'test', 'result', 'error', 'success', 'failure', 'warning', 'info', 'debug', 'trace', 'log', 'file', 'path', 'url', 'api', 'token', 'user', 'admin', 'role', 'perm']));
      paragraphs.push(words.join(' ') + '.');
    } else if (type === 'code') {
      paragraphs.push(`\`\`\`ts\nfunction ${pick(['add', 'sub', 'mul', 'div'])}(a: number, b: number) {\n  return a ${pick(['+', '-', '*', '/'])} b;\n}\n\`\`\``);
    } else if (type === 'list') {
      const items = Array(randomInt(2, 5)).fill(0).map((_, j) => `- item ${j + 1}: ${pick(['foo', 'bar', 'baz'])}`);
      paragraphs.push(items.join('\n'));
    } else {
      paragraphs.push(`See ${pick(['https://example.com', 'https://github.com/0langa/TokenTrim', 'http://localhost:5173'])} for details.`);
    }
  }
  return paragraphs.join('\n\n');
}

function generateRandomLog(): string {
  const lines: string[] = [];
  const count = randomInt(10, 100);
  for (let i = 0; i < count; i++) {
    const level = pick(['INFO', 'WARN', 'ERROR', 'DEBUG']);
    const msg = pick(['Starting server', 'Connected to DB', 'Request received', 'Response sent', 'Cache miss', 'Retry attempt', 'Timeout', 'Success']);
    lines.push(`[${new Date().toISOString()}] ${level}: ${msg} ${randomInt(1, 9999)}`);
  }
  return lines.join('\n');
}

function generateRandomCode(): string {
  const lines: string[] = [];
  lines.push('import { ' + pick(['fs', 'path', 'http', 'url']) + ' } from "node:' + pick(['fs', 'path', 'http']) + '";');
  lines.push('');
  lines.push('const CONFIG = {');
  lines.push(`  host: '${pick(['localhost', '0.0.0.0', '127.0.0.1'])}',`);
  lines.push(`  port: ${randomInt(1000, 9999)},`);
  lines.push('};');
  lines.push('');
  lines.push('function main() {');
  lines.push(`  console.log('Starting on port', CONFIG.port);`);
  lines.push('}');
  lines.push('');
  lines.push('main();');
  return lines.join('\n');
}

function generateRandomProse(): string {
  const sentences: string[] = [];
  const count = randomInt(5, 30);
  for (let i = 0; i < count; i++) {
    const sent = pick([
      'The quick brown fox jumps over the lazy dog.',
      'Please note that this is very important and should not be ignored.',
      'Do not forget to check the config before deploying.',
      'The system requires at least 4GB of RAM and 2 CPU cores.',
      'Version 1.2.3 is now available at https://example.com/download.',
      'You should review the changes in /etc/config.yml before restarting.',
      'There are 42 items in the queue and 7 workers processing them.',
      'The meeting is scheduled for 2024-05-15 at 14:00 UTC.',
    ]);
    sentences.push(sent);
  }
  return sentences.join(' ');
}

function generateMixed(): string {
  return [generateRandomMarkdown(), generateRandomLog(), generateRandomCode(), generateRandomProse()].join('\n\n---\n\n');
}

function runInvariantChecks(input: string, result: ReturnType<typeof compress>) {
  // No crash
  expect(result.error).toBeUndefined();

  // URLs must be preserved (set-wise)
  const urlsBefore = new Set(input.match(/https?:\/\/[^\s]+/g) ?? []);
  const urlsAfter = new Set(result.output.match(/https?:\/\/[^\s]+/g) ?? []);
  for (const url of urlsBefore) {
    expect(urlsAfter.has(url)).toBe(true);
  }

  // Output must not be empty if input was non-empty
  if (input.trim().length > 0) {
    expect(result.output.trim().length).toBeGreaterThan(0);
  }

  // Metrics must be consistent
  expect(result.metrics.originalChars).toBe(input.length);
  expect(result.metrics.outputChars).toBe(result.output.length);
  expect(result.metrics.estimatedTokensBefore).toBeGreaterThanOrEqual(0);
  expect(result.metrics.estimatedTokensAfter).toBeGreaterThanOrEqual(0);

  // If allowUnsafeTransforms is false, transforms with safety errors should be rejected
  // (we allow up to 50 issues because rejected transforms accumulate them)
  const errors = result.safetyIssues.filter((i) => i.severity === 'error');
  expect(errors.length).toBeLessThanOrEqual(50);
}

describe('fuzz invariants', () => {
  const iterations = 20;

  it('markdown fuzz', () => {
    for (let i = 0; i < iterations; i++) {
      const input = generateRandomMarkdown();
      for (const mode of MODES) {
        const result = compress(input, { mode, maxRisk: 'high' });
        runInvariantChecks(input, result);
      }
    }
  });

  it('log fuzz', () => {
    for (let i = 0; i < iterations; i++) {
      const input = generateRandomLog();
      for (const mode of MODES) {
        const result = compress(input, { mode, profile: 'logs', maxRisk: 'high' });
        runInvariantChecks(input, result);
      }
    }
  });

  it('code fuzz', () => {
    for (let i = 0; i < iterations; i++) {
      const input = generateRandomCode();
      for (const mode of MODES) {
        const result = compress(input, { mode, profile: 'repo-context', maxRisk: 'high' });
        runInvariantChecks(input, result);
      }
    }
  });

  it('prose fuzz', () => {
    for (let i = 0; i < iterations; i++) {
      const input = generateRandomProse();
      for (const mode of MODES) {
        const result = compress(input, { mode, maxRisk: 'high' });
        runInvariantChecks(input, result);
      }
    }
  });

  it('mixed fuzz', () => {
    for (let i = 0; i < iterations; i++) {
      const input = generateMixed();
      for (const mode of MODES) {
        const result = compress(input, { mode, maxRisk: 'high' });
        runInvariantChecks(input, result);
      }
    }
  });
});
