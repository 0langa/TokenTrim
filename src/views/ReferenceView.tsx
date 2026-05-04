import { useState } from 'react';
import { MODES } from '../compression/modes';
import { PROFILE_META, PROFILE_TRANSFORM_ORDER } from '../compression/profiles';
import { TRANSFORM_REGISTRY } from '../compression/transformRegistry';
import type { RiskLevel } from '../compression/types';

type Section = 'modes' | 'profiles' | 'risk' | 'transforms';

const RISK_COLORS: Record<RiskLevel, { badge: string; dot: string }> = {
  safe:   { badge: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900', dot: 'bg-green-500' },
  low:    { badge: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900', dot: 'bg-blue-500' },
  medium: { badge: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900', dot: 'bg-amber-500' },
  high:   { badge: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900', dot: 'bg-red-500' },
};

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const c = RISK_COLORS[risk];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${c.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {risk}
    </span>
  );
}

const RISK_META: Record<RiskLevel, { label: string; description: string; examples: string }> = {
  safe: {
    label: 'Safe',
    description: 'Structural-only changes. No wording is altered. Transforms can only remove extra whitespace, normalize indentation, or minify JSON.',
    examples: 'Markdown whitespace cleanup, JSON minification',
  },
  low: {
    label: 'Low',
    description: 'Minor wording adjustments with negligible semantic impact. Meaning is fully preserved.',
    examples: 'Number words → digits ("twenty" → "20"), common abbreviations ("JavaScript" → "JS")',
  },
  medium: {
    label: 'Medium',
    description: 'Moderate rewriting. Filler phrases removed, verbose expressions condensed, articles dropped. Meaning preserved but style changes noticeably.',
    examples: '"due to the fact that" → "because", "basically please note that" → removed, "the cat" → "cat"',
  },
  high: {
    label: 'High',
    description: 'Aggressive compression. Words replaced with symbols, vowels dropped from long words, prepositions and auxiliaries stripped. Readability significantly reduced — output is not natural language.',
    examples: '"greater than or equal to" → "≥", "beautiful" → "bltfl", "therefore" → "=>"',
  },
};

const TRANSFORM_EXAMPLES: Record<string, { before: string; after: string }> = {
  'markdown-cleanup':   { before: '# Title\n\n\n\nParagraph text', after: '# Title\n\nParagraph text' },
  'structured-data':    { before: '{ "key" : "value" , "n" : 1 }', after: '{"key":"value","n":1}' },
  'filler-removal':     { before: 'Please note that basically you should check this.', after: 'You should check this.' },
  'numeric':            { before: 'twenty thousand users over three months', after: '20k users over 3 months' },
  'prose-rewrite:common': { before: 'due to the fact that the system is down', after: 'because the system is down' },
  'article-removal':    { before: 'The cat sat on the mat in the room.', after: 'cat sat on mat in room.' },
  'abbreviation':       { before: 'JavaScript framework with TypeScript support', after: 'JS framework w/ TS support' },
  'operator':           { before: 'greater than or equal to the threshold', after: '≥ the threshold' },
  'caveman-compaction': { before: 'the implementation should be beautiful', after: 'implmntn shold be bltfl' },
  'deduplication':      { before: 'The quick brown fox.\n\nThe quick brown fox.', after: 'The quick brown fox.' },
  'section-salience':   { before: 'Thanks for reading! Sounds good.\n\nKey finding: latency up 40%.', after: 'Key finding: latency up 40%.' },
  'log-compression':    { before: 'ERROR: Connection refused\nERROR: Connection refused\nERROR: Connection refused', after: 'ERROR: Connection refused [×3]' },
};

const TABS: Array<{ id: Section; label: string }> = [
  { id: 'modes', label: 'Modes' },
  { id: 'profiles', label: 'Use Cases' },
  { id: 'risk', label: 'Risk Levels' },
  { id: 'transforms', label: 'Transforms' },
];

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 ${className}`}>
      {children}
    </div>
  );
}

function CodeSpan({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[11px] font-mono bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-slate-600 dark:text-slate-400">
      {children}
    </code>
  );
}

function ModesSection() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Compression strength controls how aggressively text is transformed. Higher modes apply more transforms and make bolder changes.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {MODES.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.label}</h3>
              <div className="flex items-center gap-2 shrink-0">
                <RiskBadge risk={m.risk} />
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 leading-relaxed">{m.description}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-500 italic mb-2">{m.guidance}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Expected savings: ~{m.expectedSavingsPct[0]}–{m.expectedSavingsPct[1]}%
            </p>
            {m.id !== 'custom' && (
              <div className="mt-2 flex flex-wrap gap-1">
                {TRANSFORM_REGISTRY
                  .filter((t) => t.defaultModes.includes(m.id))
                  .map((t) => (
                    <CodeSpan key={t.id}>{t.label}</CodeSpan>
                  ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProfilesSection() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Use case profiles control which transforms run and in what order. Each profile is tuned for a specific type of input content.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {(Object.entries(PROFILE_META) as Array<[string, typeof PROFILE_META[keyof typeof PROFILE_META]]>).map(([id, meta]) => {
          const pipeline = PROFILE_TRANSFORM_ORDER[id as keyof typeof PROFILE_TRANSFORM_ORDER] ?? [];
          return (
            <Card key={id}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{meta.label}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">{meta.description}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-2">
                <span className="font-medium">Input:</span> {meta.inputType}
              </p>
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wide">Transform pipeline</p>
                <div className="flex flex-wrap gap-1">
                  {pipeline.map((t, i) => (
                    <span key={t} className="flex items-center gap-1">
                      <CodeSpan>{t}</CodeSpan>
                      {i < pipeline.length - 1 && <span className="text-slate-400 text-[10px]">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function RiskSection() {
  const levels: RiskLevel[] = ['safe', 'low', 'medium', 'high'];
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        The risk level caps how aggressively transforms are allowed to modify your text. Transforms with a risk higher than your setting are skipped.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {levels.map((level) => {
          const meta = RISK_META[level];
          const transformsAtLevel = TRANSFORM_REGISTRY.filter((t) => t.risk === level);
          return (
            <Card key={level}>
              <div className="flex items-center gap-2 mb-2">
                <RiskBadge risk={level} />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{meta.label}</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">{meta.description}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 italic mb-2">{meta.examples}</p>
              {transformsAtLevel.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {transformsAtLevel.map((t) => <CodeSpan key={t.id}>{t.label}</CodeSpan>)}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TransformsSection() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Transforms are the individual text processing steps. Each has a defined risk level, default activation modes, and specific examples of what it changes.
      </p>
      <div className="space-y-2">
        {TRANSFORM_REGISTRY.map((t) => {
          const ex = TRANSFORM_EXAMPLES[t.id];
          const isOpen = expanded === t.id;
          return (
            <Card key={t.id} className="cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
              <button
                className="w-full text-left"
                onClick={() => setExpanded(isOpen ? null : t.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.label}</span>
                    <RiskBadge risk={t.risk} />
                  </div>
                  <span className="text-slate-400 text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">{t.description}</p>
              </button>
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-wrap gap-3 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Active in modes:</span>{' '}
                      {t.defaultModes.join(', ')}
                    </span>
                    {t.profileOnly && (
                      <span className="text-slate-500 dark:text-slate-400">
                        <span className="font-medium">Profiles:</span>{' '}
                        {(t.profiles ?? []).join(', ')}
                      </span>
                    )}
                  </div>
                  {ex && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wide">Example</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-2 text-red-700 dark:text-red-400 leading-relaxed whitespace-pre-wrap">
                          <span className="not-italic font-sans text-[9px] uppercase tracking-wide font-semibold text-red-500 block mb-1">Before</span>
                          {ex.before}
                        </div>
                        <div className="rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-2 text-green-700 dark:text-green-400 leading-relaxed whitespace-pre-wrap">
                          <span className="not-italic font-sans text-[9px] uppercase tracking-wide font-semibold text-green-500 block mb-1">After</span>
                          {ex.after}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function ReferenceView() {
  const [section, setSection] = useState<Section>('modes');

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors shrink-0 ${
              section === tab.id
                ? 'border-violet-500 text-violet-700 dark:text-violet-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {section === 'modes' && <ModesSection />}
          {section === 'profiles' && <ProfilesSection />}
          {section === 'risk' && <RiskSection />}
          {section === 'transforms' && <TransformsSection />}
        </div>
      </div>
    </div>
  );
}
