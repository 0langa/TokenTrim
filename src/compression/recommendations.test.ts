import { describe, expect, it } from 'vitest';
import {
  getRecommendationForFilename,
  getRecommendationForText,
} from './recommendations';

describe('compression recommendations', () => {
  it('maps common file extensions to useful profiles', () => {
    expect(getRecommendationForFilename('README.md')?.profile).toBe('markdown-docs');
    expect(getRecommendationForFilename('app.log')?.profile).toBe('logs');
    expect(getRecommendationForFilename('server.ts')?.profile).toBe('repo-context');
    expect(getRecommendationForFilename('rows.csv')?.profile).toBe('csv');
  });

  it('detects instruction-heavy text', () => {
    const recommendation = getRecommendationForText(
      'You are a coding agent. Preserve all numbers. Return only the answer.',
    );
    expect(recommendation?.profile).toBe('agent-context');
    expect(recommendation?.mode).toBe('normal');
  });

  it('detects logs before generic text', () => {
    const recommendation = getRecommendationForText(
      'ERROR Connection refused\nERROR Connection refused\nat foo (app.ts:10:2)',
    );
    expect(recommendation?.profile).toBe('logs');
    expect(recommendation?.mode).toBe('heavy');
  });

  it('detects markdown structure', () => {
    const recommendation = getRecommendationForText(
      '# Setup\n\n- Install deps\n- Run `npm run dev`\n',
    );
    expect(recommendation?.profile).toBe('markdown-docs');
  });
});
