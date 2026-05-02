import { describe, it, expect } from 'vitest';
import { PRESETS, findPreset } from './presets';

describe('presets', () => {
  it('defines all expected preset ids', () => {
    const ids = PRESETS.map((p) => p.id);
    expect(ids).toContain('prompt');
    expect(ids).toContain('logs');
    expect(ids).toContain('repo');
    expect(ids).toContain('docs');
    expect(ids).toContain('chat');
    expect(ids).toContain('generic');
  });

  it('each preset has required fields', () => {
    for (const preset of PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(['general', 'agent-context', 'repo-context', 'logs', 'markdown-docs', 'chat-history']).toContain(preset.profile);
      expect(['light', 'normal', 'heavy', 'ultra', 'custom']).toContain(preset.mode);
      expect(['safe', 'low', 'medium', 'high']).toContain(preset.maxRisk);
    }
  });

  it('prompt preset maps to agent-context profile', () => {
    const p = findPreset('prompt');
    expect(p?.profile).toBe('agent-context');
    expect(p?.maxRisk).toBe('medium');
  });

  it('logs preset maps to logs profile with heavy mode', () => {
    const p = findPreset('logs');
    expect(p?.profile).toBe('logs');
    expect(p?.mode).toBe('heavy');
  });

  it('repo preset maps to repo-context', () => {
    const p = findPreset('repo');
    expect(p?.profile).toBe('repo-context');
  });

  it('generic preset maps to general profile', () => {
    const p = findPreset('generic');
    expect(p?.profile).toBe('general');
  });

  it('findPreset returns undefined for unknown id', () => {
    expect(findPreset('nonexistent')).toBeUndefined();
  });

  it('no preset uses high risk by default', () => {
    const highRisk = PRESETS.filter((p) => p.maxRisk === 'high');
    expect(highRisk.length).toBe(0);
  });
});
