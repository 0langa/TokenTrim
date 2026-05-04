import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from './cli';

describe('cli validation', () => {
  it('rejects invalid enum values', async () => {
    const stderr = { data: '', write(chunk: string) { this.data += chunk; return true; } };
    const code = await runCli(['compress', 'missing.txt', '--mode', 'invalid'], { stdout: process.stdout, stderr: stderr as unknown as NodeJS.WriteStream });
    expect(code).toBe(1);
    expect(stderr.data).toContain('Invalid --mode');
  });

  it('rejects invalid target tokens', async () => {
    const stderr = { data: '', write(chunk: string) { this.data += chunk; return true; } };
    const code = await runCli(['stdin', '--target-tokens', '-2'], { stdout: process.stdout, stderr: stderr as unknown as NodeJS.WriteStream });
    expect(code).toBe(1);
    expect(stderr.data).toContain('--target-tokens must be a positive integer');
  });

  it('rejects unknown transforms', async () => {
    const stderr = { data: '', write(chunk: string) { this.data += chunk; return true; } };
    const code = await runCli(['stdin', '--enabled-transforms', 'not-real'], { stdout: process.stdout, stderr: stderr as unknown as NodeJS.WriteStream });
    expect(code).toBe(1);
    expect(stderr.data).toContain('Unknown transform id');
  });

  it('writes compressed output file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tokentrim-cli-'));
    const input = path.join(dir, 'input.txt');
    const output = path.join(dir, 'out.txt');
    fs.writeFileSync(input, 'Please note that we should reduce this text.', 'utf8');
    const code = await runCli(['compress', input, '--mode', 'normal', '--out', output], { stdout: process.stdout, stderr: process.stderr });
    expect(code).toBe(0);
    const written = fs.readFileSync(output, 'utf8');
    expect(written.length).toBeGreaterThan(0);
  });
});

describe('cli discovery commands', () => {
  async function captureStdout(args: string[]): Promise<{ code: number; out: string }> {
    const out = { data: '', write(chunk: string) { this.data += chunk; return true; } };
    const code = await runCli(args, { stdout: out as unknown as NodeJS.WriteStream, stderr: process.stderr });
    return { code, out: out.data };
  }

  it('list-transforms outputs transform ids', async () => {
    const { code, out } = await captureStdout(['list-transforms']);
    expect(code).toBe(0);
    expect(out).toContain('filler-removal');
    expect(out).toContain('log-compression');
  });

  it('list-transforms --format json outputs valid JSON array', async () => {
    const { code, out } = await captureStdout(['list-transforms', '--format', 'json']);
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty('id');
    expect(parsed[0]).toHaveProperty('label');
    expect(parsed[0]).toHaveProperty('risk');
  });

  it('list-profiles outputs profile names', async () => {
    const { code, out } = await captureStdout(['list-profiles']);
    expect(code).toBe(0);
    expect(out).toContain('general');
    expect(out).toContain('logs');
    expect(out).toContain('agent-context');
  });

  it('list-profiles --format json outputs valid JSON array', async () => {
    const { code, out } = await captureStdout(['list-profiles', '--format', 'json']);
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((p: { id: string }) => p.id === 'general')).toBe(true);
  });

  it('list-tokenizers outputs tokenizer names', async () => {
    const { code, out } = await captureStdout(['list-tokenizers']);
    expect(code).toBe(0);
    expect(out).toContain('approx-generic');
    expect(out).toContain('openai-cl100k');
  });

  it('list-modes outputs mode names', async () => {
    const { code, out } = await captureStdout(['list-modes']);
    expect(code).toBe(0);
    expect(out).toContain('light');
    expect(out).toContain('normal');
    expect(out).toContain('heavy');
    expect(out).toContain('ultra');
  });
});

describe('cli init command', () => {
  it('writes starter config file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tokentrim-init-'));
    const code = await runCli(['init', '--out', path.join(dir, '.tokentrimrc.json')], { stdout: process.stdout, stderr: process.stderr });
    expect(code).toBe(0);
    const written = fs.readFileSync(path.join(dir, '.tokentrimrc.json'), 'utf8');
    const parsed = JSON.parse(written);
    expect(parsed.mode).toBeTruthy();
    expect(parsed.profile).toBeTruthy();
  });
});
