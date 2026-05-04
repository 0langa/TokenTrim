import { useState } from 'react';
import { useTheme } from './hooks/useTheme';
import { AppShell } from './components/layout/AppShell';
import { CompressView } from './views/CompressView';
import { CompareView } from './views/CompareView';
import { SettingsView } from './views/SettingsView';
import { ReferenceView } from './views/ReferenceView';
import { LlmCompressView } from './views/LlmCompressView';
import type { AppView } from './components/layout/TopBar';
import type { TokenizerKind } from './compression/types';
import { decodeState } from './lib/shareableUrl';

const URL_STATE = typeof window !== 'undefined' ? decodeState(window.location.search) : null;

export default function App() {
  const [view, setView] = useState<AppView>('compress');
  const [theme, toggleTheme] = useTheme();
  const [tokenizer, setTokenizer] = useState<TokenizerKind>(URL_STATE?.tokenizer ?? 'approx-generic');
  const [targetTokens, setTargetTokens] = useState<string>(URL_STATE?.targetTokens ?? '');
  const [allowUnsafeTransforms, setAllowUnsafeTransforms] = useState(URL_STATE?.allowUnsafeTransforms ?? false);

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
      {view === 'compare' && (
        <CompareView tokenizer={tokenizer} />
      )}
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
      {view === 'llm-compress' && <LlmCompressView />}
    </AppShell>
  );
}
