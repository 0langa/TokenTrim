import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  shouldIgnore,
  loadIgnorePatterns,
  walkFilesWithIgnore,
  isTextFile,
} from './ignorePatterns';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tokentrim-ign-'));
}

describe('shouldIgnore', () => {
  it('ignores node_modules', () => {
    const cwd = '/project';
    expect(shouldIgnore('/project/node_modules/lodash/index.js', [], cwd)).toBe(true);
  });

  it('ignores dist directory', () => {
    expect(shouldIgnore('/project/dist/index.js', [], '/project')).toBe(true);
  });

  it('ignores binary extensions', () => {
    expect(shouldIgnore('/project/logo.png', [], '/project')).toBe(true);
    expect(shouldIgnore('/project/bundle.zip', [], '/project')).toBe(true);
    expect(shouldIgnore('/project/app.exe', [], '/project')).toBe(true);
  });

  it('ignores lock files', () => {
    expect(shouldIgnore('/project/package-lock.json', [], '/project')).toBe(true);
    expect(shouldIgnore('/project/yarn.lock', [], '/project')).toBe(true);
  });

  it('does not ignore regular source files', () => {
    expect(shouldIgnore('/project/src/index.ts', [], '/project')).toBe(false);
    expect(shouldIgnore('/project/README.md', [], '/project')).toBe(false);
  });

  it('applies .tokentrimignore wildcard patterns', () => {
    expect(shouldIgnore('/project/data.generated.ts', ['*.generated.ts'], '/project')).toBe(true);
    expect(shouldIgnore('/project/src/app.ts', ['*.generated.ts'], '/project')).toBe(false);
  });

  it('applies .tokentrimignore exact name patterns', () => {
    expect(shouldIgnore('/project/fixtures/data.json', ['fixtures'], '/project')).toBe(true);
  });
});

describe('loadIgnorePatterns', () => {
  it('returns empty array when no .tokentrimignore exists', () => {
    const dir = tmpDir();
    expect(loadIgnorePatterns(dir)).toEqual([]);
  });

  it('loads patterns from .tokentrimignore', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, '.tokentrimignore'), '# comment\ngenerated/\n*.min.js\n', 'utf8');
    const patterns = loadIgnorePatterns(dir);
    expect(patterns).toContain('generated/');
    expect(patterns).toContain('*.min.js');
    expect(patterns).not.toContain('# comment');
  });
});

describe('walkFilesWithIgnore', () => {
  it('walks included files and counts skipped', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'readme.md'), 'hello', 'utf8');
    fs.writeFileSync(path.join(dir, 'logo.png'), '', 'utf8');
    const result = walkFilesWithIgnore(dir, [], dir);
    expect(result.included.some((f) => f.endsWith('readme.md'))).toBe(true);
    expect(result.included.every((f) => !f.endsWith('logo.png'))).toBe(true);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it('skips .tokentrimignore patterns', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'file.ts'), 'code', 'utf8');
    fs.writeFileSync(path.join(dir, 'file.generated.ts'), 'generated', 'utf8');
    const result = walkFilesWithIgnore(dir, ['*.generated.ts'], dir);
    expect(result.included.some((f) => f.endsWith('file.ts'))).toBe(true);
    expect(result.included.every((f) => !f.endsWith('file.generated.ts'))).toBe(true);
  });

  it('recurses into subdirectories', () => {
    const dir = tmpDir();
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'app.ts'), 'code', 'utf8');
    const result = walkFilesWithIgnore(dir, [], dir);
    expect(result.included.some((f) => f.endsWith('app.ts'))).toBe(true);
  });

  it('skips node_modules recursion', () => {
    const dir = tmpDir();
    fs.mkdirSync(path.join(dir, 'node_modules', 'lodash'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', 'lodash', 'index.js'), 'code', 'utf8');
    const result = walkFilesWithIgnore(dir, [], dir);
    expect(result.included.every((f) => !f.includes('node_modules'))).toBe(true);
  });
});

describe('isTextFile', () => {
  it('returns true for text extensions', () => {
    expect(isTextFile('src/app.ts')).toBe(true);
    expect(isTextFile('README.md')).toBe(true);
    expect(isTextFile('Makefile')).toBe(true);
  });

  it('returns false for binary extensions', () => {
    expect(isTextFile('logo.png')).toBe(false);
    expect(isTextFile('bundle.exe')).toBe(false);
  });
});
