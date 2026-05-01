import { applyRules, type Rule } from './shared';

const PACKS: Record<string, Rule[]> = {
  common: [
    { pattern: /\bdue to the fact that\b/gi, replacement: 'because' },
    { pattern: /\bin order to\b/gi, replacement: 'to' },
    { pattern: /\bwith regard to\b/gi, replacement: 'about' },
  ],
  'agent-prompts': [
    { pattern: /\bplease provide\b/gi, replacement: 'give' },
    { pattern: /\bcan you\b/gi, replacement: '' },
    { pattern: /\bI need you to\b/gi, replacement: '' },
  ],
  'project-specs': [
    { pattern: /\bacceptance criteria\b/gi, replacement: 'criteria' },
    { pattern: /\bnon-functional requirements\b/gi, replacement: 'NFRs' },
  ],
  'docs-readme': [
    { pattern: /\bfor the purpose of\b/gi, replacement: 'for' },
    { pattern: /\bin addition to\b/gi, replacement: 'and' },
  ],
  email: [
    { pattern: /\bthanks in advance\b/gi, replacement: 'thanks' },
    { pattern: /\bjust following up\b/gi, replacement: 'follow-up' },
  ],
  'research-notes': [
    { pattern: /\bit is worth noting that\b/gi, replacement: 'note:' },
    { pattern: /\ba large number of\b/gi, replacement: 'many' },
  ],
};

export function proseRewrite(input: string, pack: string) {
  return applyRules(input, `prose-rewrite:${pack}`, 'medium', PACKS[pack] ?? []);
}
