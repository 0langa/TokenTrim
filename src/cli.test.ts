import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from './cli';

describe('cli validation', () => {
  it('rejects invalid enum values', () => {
    const stderr = { data: '', write(chunk: string) { this.data += chunk; return true; } };
    const code = runCli(['compress', 'missing.txt', '--mode', 'invalid'], { stdout: process.stdout, stderr: stderr as unknown as NodeJS.WriteStream });
    expect(code).toBe(1);
    expect(stderr.data).toContain('Invalid --mode');
  });

  it('rejects invalid target tokens', () => {
    const stderr = { data: '', write(chunk: string) { this.data += chunk; return true; } };
    const code = runCli(['stdin', '--target-tokens', '-2'], { stdout: process.stdout, stderr: stderr as unknown as NodeJS.WriteStream });
    expect(code).toBe(1);
    expect(stderr.data).toContain('--target-tokens must be a positive integer');
  });

  it('rejects unknown transforms', () => {
    const stderr = { data: '', write(chunk: string) { this.data += chunk; return true; } };
    const code = runCli(['stdin', '--enabled-transforms', 'not-real'], { stdout: process.stdout, stderr: stderr as unknown as NodeJS.WriteStream });
    expect(code).toBe(1);
    expect(stderr.data).toContain('Unknown transform id');
  });

  it('writes compressed output file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tokentrim-cli-'));
    const input = path.join(dir, 'input.txt');
    const output = path.join(dir, 'out.txt');
    fs.writeFileSync(input, 'Please note that we should reduce this text.', 'utf8');
    const code = runCli(['compress', input, '--mode', 'normal', '--out', output], { stdout: process.stdout, stderr: process.stderr });
    expect(code).toBe(0);
    const written = fs.readFileSync(output, 'utf8');
    expect(written.length).toBeGreaterThan(0);
  });
});
