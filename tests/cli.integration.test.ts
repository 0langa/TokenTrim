import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runCli } from '../src/cli';

// We test the built CLI binary when available, and also import runCli directly.
const distCli = path.resolve(fileURLToPath(import.meta.url), '../../dist/cli.js');
const hasDistCli = fs.existsSync(distCli);

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tokentrim-cli-'));
}

function runDist(argv: string[], cwd?: string): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(process.execPath, [distCli, ...argv], {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
}

describe('CLI integration (dist/cli.js)', () => {
  it.skipIf(!hasDistCli)('prints help with --help', () => {
    const { stdout, status } = runDist(['--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('tokentrim');
    expect(stdout).toContain('Commands:');
  });

  it.skipIf(!hasDistCli)('compresses a file', () => {
    const dir = tmpDir();
    const input = path.join(dir, 'input.md');
    fs.writeFileSync(input, '# Hello World\n\nThis is a simple test document.\n', 'utf8');
    const { stdout, status } = runDist(['compress', input, '--mode', 'light'], dir);
    expect(status).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
  });

  it.skipIf(!hasDistCli)('generates a report', () => {
    const dir = tmpDir();
    const input = path.join(dir, 'input.md');
    fs.writeFileSync(input, '# Report Test\n\nSome content here.\n', 'utf8');
    const { stdout, status } = runDist(['report', input, '--mode', 'light', '--format', 'json'], dir);
    expect(status).toBe(0);
    const report = JSON.parse(stdout);
    expect(report).toHaveProperty('version');
    expect(report).toHaveProperty('input');
    expect(report).toHaveProperty('output');
  });

  it.skipIf(!hasDistCli)('initializes a config file', () => {
    const dir = tmpDir();
    const { stdout, status } = runDist(['init'], dir);
    expect(status).toBe(0);
    expect(stdout).toContain('Created');
    const cfgPath = path.join(dir, '.tokentrimrc.json');
    expect(fs.existsSync(cfgPath)).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    expect(cfg).toHaveProperty('mode');
  });

  it.skipIf(!hasDistCli)('refuses to overwrite existing config', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc.json'), '{}', 'utf8');
    const { stderr, status } = runDist(['init'], dir);
    expect(status).toBe(1);
    expect(stderr).toContain('already exists');
  });

  it.skipIf(!hasDistCli)('lists transforms', () => {
    const { stdout, status } = runDist(['list-transforms']);
    expect(status).toBe(0);
    expect(stdout).toContain('filler-removal');
  });

  it.skipIf(!hasDistCli)('lists profiles', () => {
    const { stdout, status } = runDist(['list-profiles']);
    expect(status).toBe(0);
    expect(stdout).toContain('general');
  });

  it.skipIf(!hasDistCli)('lists modes', () => {
    const { stdout, status } = runDist(['list-modes']);
    expect(status).toBe(0);
    expect(stdout).toContain('light');
    expect(stdout).toContain('ultra');
  });

  it.skipIf(!hasDistCli)('lists tokenizers', () => {
    const { stdout, status } = runDist(['list-tokenizers']);
    expect(status).toBe(0);
    expect(stdout).toContain('approx-generic');
  });

  it.skipIf(!hasDistCli)('batch processes a directory', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'a.md'), '# A\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'b.md'), '# B\n', 'utf8');
    const { stdout, status } = runDist(['batch', dir, '--mode', 'light'], dir);
    expect(status).toBe(0);
    expect(stdout).toContain('a.md');
    expect(stdout).toContain('b.md');
  });

  it.skipIf(!hasDistCli)('reads from stdin', () => {
    const result = spawnSync(process.execPath, [distCli, 'stdin', '--mode', 'light'], {
      input: 'Hello world, this is a test.\n',
      encoding: 'utf8',
      timeout: 10000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it.skipIf(!hasDistCli)('respects config file', () => {
    const dir = tmpDir();
    fs.writeFileSync(
      path.join(dir, '.tokentrimrc.json'),
      JSON.stringify({ mode: 'heavy', profile: 'general' }),
      'utf8',
    );
    const input = path.join(dir, 'input.md');
    fs.writeFileSync(input, '# Test\n\nSome verbose text here for compression.\n', 'utf8');
    const { stdout, status } = runDist(['compress', input], dir);
    expect(status).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
  });
});

describe('CLI integration (runCli direct)', () => {
  function capture() {
    const out: string[] = [];
    const err: string[] = [];
    const stdout = { write: (s: string) => out.push(s) } as unknown as NodeJS.WriteStream;
    const stderr = { write: (s: string) => err.push(s) } as unknown as NodeJS.WriteStream;
    return {
      stdout,
      stderr,
      get out() { return out.join(''); },
      get err() { return err.join(''); },
    };
  }

  it('prints help', async () => {
    const c = capture();
    const code = await runCli(['help'], { stdout: c.stdout, stderr: c.stderr });
    expect(code).toBe(0);
    expect(c.out).toContain('Commands:');
  });

  it('validates stdin command without hanging (no actual stdin)', async () => {
    // Direct import tests cannot easily provide stdin; this is covered by the subprocess suite.
    const c = capture();
    const code = await runCli(['help'], { stdout: c.stdout, stderr: c.stderr });
    expect(code).toBe(0);
    expect(c.out).toContain('stdin');
  });

  it('lists transforms as JSON', async () => {
    const c = capture();
    const code = await runCli(['list-transforms', '--format', 'json'], { stdout: c.stdout, stderr: c.stderr });
    expect(code).toBe(0);
    const data = JSON.parse(c.out);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('id');
  });

  it('lists profiles as JSON', async () => {
    const c = capture();
    const code = await runCli(['list-profiles', '--format', 'json'], { stdout: c.stdout, stderr: c.stderr });
    expect(code).toBe(0);
    const data = JSON.parse(c.out);
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((p: { id: string }) => p.id === 'general')).toBe(true);
  });

  it('rejects unknown command', async () => {
    const c = capture();
    const code = await runCli(['nope'], { stdout: c.stdout, stderr: c.stderr });
    expect(code).toBe(1);
    expect(c.err).toContain('Unknown command');
  });

  it('rejects invalid mode', async () => {
    const c = capture();
    const code = await runCli(['stdin', '--mode', 'impossible'], { stdout: c.stdout, stderr: c.stderr });
    expect(code).toBe(1);
    expect(c.err).toContain('Invalid');
  });

  it('rejects invalid enabled-transforms', async () => {
    const c = capture();
    const code = await runCli(['stdin', '--enabled-transforms', 'fake-transform'], { stdout: c.stdout, stderr: c.stderr });
    expect(code).toBe(1);
    expect(c.err).toContain('Unknown transform');
  });

  it('init creates starter config', async () => {
    const dir = tmpDir();
    const originalCwd = process.cwd();
    process.chdir(dir);
    try {
      const c = capture();
      const code = await runCli(['init'], { stdout: c.stdout, stderr: c.stderr });
      expect(code).toBe(0);
      expect(c.out).toContain('Created');
      expect(fs.existsSync(path.join(dir, '.tokentrimrc.json'))).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('init refuses to overwrite', async () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc.json'), '{}', 'utf8');
    const originalCwd = process.cwd();
    process.chdir(dir);
    try {
      const c = capture();
      const code = await runCli(['init'], { stdout: c.stdout, stderr: c.stderr });
      expect(code).toBe(1);
      expect(c.err).toContain('already exists');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('compress writes to --out', async () => {
    const dir = tmpDir();
    const input = path.join(dir, 'input.md');
    const output = path.join(dir, 'output.md');
    fs.writeFileSync(input, '# Hello\n\nWorld\n', 'utf8');
    const c = capture();
    const code = await runCli(['compress', input, '--out', output, '--mode', 'light'], { stdout: c.stdout, stderr: c.stderr });
    expect(code).toBe(0);
    expect(fs.existsSync(output)).toBe(true);
    expect(fs.readFileSync(output, 'utf8').length).toBeGreaterThan(0);
  });

  it('report writes JSON to --out', async () => {
    const dir = tmpDir();
    const input = path.join(dir, 'input.md');
    const output = path.join(dir, 'report.json');
    fs.writeFileSync(input, '# Test\n', 'utf8');
    const c = capture();
    const code = await runCli(['report', input, '--out', output, '--mode', 'light'], { stdout: c.stdout, stderr: c.stderr });
    expect(code).toBe(0);
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    expect(report).toHaveProperty('version');
  });
});
