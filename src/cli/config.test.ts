import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, STARTER_CONFIG } from './config';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tokentrim-cfg-'));
}

describe('CLI config loading', () => {
  it('returns empty config when no config file exists', () => {
    const dir = tmpDir();
    const cfg = loadConfig(dir);
    expect(cfg).toEqual({});
  });

  it('loads .tokentrimrc.json', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc.json'), JSON.stringify({ mode: 'heavy', maxRisk: 'medium' }), 'utf8');
    const cfg = loadConfig(dir);
    expect(cfg.mode).toBe('heavy');
    expect(cfg.maxRisk).toBe('medium');
  });

  it('loads .tokentrimrc (no extension)', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc'), JSON.stringify({ mode: 'light' }), 'utf8');
    const cfg = loadConfig(dir);
    expect(cfg.mode).toBe('light');
  });

  it('loads tokentrim.config.json', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'tokentrim.config.json'), JSON.stringify({ profile: 'logs' }), 'utf8');
    const cfg = loadConfig(dir);
    expect(cfg.profile).toBe('logs');
  });

  it('prioritizes .tokentrimrc over tokentrim.config.json', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc'), JSON.stringify({ mode: 'ultra' }), 'utf8');
    fs.writeFileSync(path.join(dir, 'tokentrim.config.json'), JSON.stringify({ mode: 'light' }), 'utf8');
    const cfg = loadConfig(dir);
    expect(cfg.mode).toBe('ultra');
  });

  it('throws on invalid JSON', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc.json'), 'not json', 'utf8');
    expect(() => loadConfig(dir)).toThrow(/invalid JSON/i);
  });

  it('throws on invalid mode value', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc.json'), JSON.stringify({ mode: 'turbo' }), 'utf8');
    expect(() => loadConfig(dir)).toThrow(/Invalid mode/i);
  });

  it('throws on invalid profile value', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc.json'), JSON.stringify({ profile: 'super-profile' }), 'utf8');
    expect(() => loadConfig(dir)).toThrow(/Invalid profile/i);
  });

  it('throws on non-positive targetTokens', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc.json'), JSON.stringify({ targetTokens: -1 }), 'utf8');
    expect(() => loadConfig(dir)).toThrow(/positive integer/i);
  });

  it('loads enabledTransforms array', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimrc.json'), JSON.stringify({ enabledTransforms: ['markdown-cleanup'] }), 'utf8');
    const cfg = loadConfig(dir);
    expect(cfg.enabledTransforms).toEqual(['markdown-cleanup']);
  });

  it('STARTER_CONFIG has required fields', () => {
    expect(STARTER_CONFIG.mode).toBeTruthy();
    expect(STARTER_CONFIG.profile).toBeTruthy();
    expect(STARTER_CONFIG.maxRisk).toBeTruthy();
  });
});
