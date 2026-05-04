import type { ReactNode } from 'react';
import { TopBar, type AppView } from './TopBar';
import { Sidebar } from './Sidebar';
import type { Theme } from '../../hooks/useTheme';

interface Props {
  view: AppView;
  onViewChange: (v: AppView) => void;
  onViewPreload: (v: AppView) => void;
  theme: Theme;
  onToggleTheme: () => void;
  children: ReactNode;
}

export function AppShell({ view, onViewChange, onViewPreload, theme, onToggleTheme, children }: Props) {
  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      <TopBar view={view} theme={theme} onToggleTheme={onToggleTheme} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar view={view} onViewChange={onViewChange} onViewPreload={onViewPreload} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
