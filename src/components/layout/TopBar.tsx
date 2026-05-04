import { TOKENTRIM_VERSION } from '../../version';
import type { Theme } from '../../hooks/useTheme';

export type AppView = 'compress' | 'settings' | 'reference' | 'compare';

const VIEW_TITLES: Record<AppView, string> = {
  compress: 'Compress',
  settings: 'Settings',
  reference: 'Reference',
  compare: 'Compare',
};

const GITHUB_URL = 'https://github.com/0langa/TokenTrim';

function SunIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface Props {
  view: AppView;
  theme: Theme;
  onToggleTheme: () => void;
}

export function TopBar({ view, theme, onToggleTheme }: Props) {
  return (
    <header className="h-12 shrink-0 flex items-center gap-4 px-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 z-10">
      <div className="flex items-center gap-3">
        <span className="text-base font-bold tracking-tight text-violet-600 dark:text-violet-400">
          TokenTrim
        </span>
        <span className="text-slate-300 dark:text-slate-700 select-none">/</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {VIEW_TITLES[view]}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded mr-2">
          local · no AI · no telemetry
        </span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          GitHub ↗
        </a>
        <span className="text-[11px] text-slate-300 dark:text-slate-600 px-1">
          v{TOKENTRIM_VERSION}
        </span>
        <button
          onClick={onToggleTheme}
          className="p-2 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
