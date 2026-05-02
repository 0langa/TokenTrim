import { describe, it, expect } from 'vitest';
import { structuredDataTransform } from './structuredDataTransform';

const PRETTY = '{\n  "name": "Alice",\n  "age": 30,\n  "active": true\n}';

describe('structuredDataTransform', () => {
  it('minifies pretty-printed JSON', () => {
    const { output } = structuredDataTransform(PRETTY);
    expect(output).toBe('{"name":"Alice","age":30,"active":true}');
  });

  it('minified output parses to same value', () => {
    const { output } = structuredDataTransform(PRETTY);
    expect(JSON.parse(output)).toEqual(JSON.parse(PRETTY));
  });

  it('stat shows charsSaved > 0', () => {
    const { stat } = structuredDataTransform(PRETTY);
    expect(stat.charsSaved).toBeGreaterThan(0);
  });

  it('non-JSON input passes through unchanged', () => {
    const input = 'This is plain text.';
    const { output, stat } = structuredDataTransform(input);
    expect(output).toBe(input);
    expect(stat.replacements).toBe(0);
  });

  it('already-minified JSON passes through (no savings)', () => {
    const input = '{"a":1}';
    const { output } = structuredDataTransform(input);
    expect(output).toBe(input);
  });

  it('JSON array is handled', () => {
    const input = '[\n  1,\n  2,\n  3\n]';
    const { output } = structuredDataTransform(input);
    expect(output).toBe('[1,2,3]');
  });

  it('invalid JSON passes through unchanged', () => {
    const input = '{ name: "Alice" }';
    const { output } = structuredDataTransform(input);
    expect(output).toBe(input);
  });
});
