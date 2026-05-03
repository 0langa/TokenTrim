import { useState } from 'react';
import { useTheme } from './hooks/useTheme';
import { AppShell } from './components/layout/AppShell';
import { CompressView } from './views/CompressView';
import { SettingsView } from './views/SettingsView';
import { ReferenceView } from './views/ReferenceView';
import type { AppView } from './components/layout/TopBar';
import type { TokenizerKind } from './compression/types';

export default function App() {
  const [view, setView] = useState<AppView>('compress');
  const [theme, toggleTheme] = useTheme();
  const [tokenizer, setTokenizer] = useState<TokenizerKind>('approx-generic');
  const [targetTokens, setTargetTokens] = useState<string>('');
  const [allowUnsafeTransforms, setAllowUnsafeTransforms] = useState(false);

  function resetAppSettings() {
    setTokenizer('approx-generic');
    setTargetTokens('');
    setAllowUnsafeTransforms(false);
  }

  return (
    <AppShell view={view} onViewChange={setView} theme={theme} onToggleTheme={toggleTheme}>
      <div className={view === 'compress' ? 'h-full' : 'hidden'}>
        <CompressView
          tokenizer={tokenizer}
          targetTokens={targetTokens}
          allowUnsafeTransforms={allowUnsafeTransforms}
          setAllowUnsafeTransforms={setAllowUnsafeTransforms}
          onResetAppSettings={resetAppSettings}
        />
      </div>
      {view === 'settings' && (
        <SettingsView
          tokenizer={tokenizer}
          setTokenizer={setTokenizer}
          targetTokens={targetTokens}
          setTargetTokens={setTargetTokens}
          allowUnsafeTransforms={allowUnsafeTransforms}
          setAllowUnsafeTransforms={setAllowUnsafeTransforms}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      {view === 'reference' && <ReferenceView />}
    </AppShell>
  );
}
