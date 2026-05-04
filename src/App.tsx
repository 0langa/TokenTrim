import { Suspense, lazy, useState } from 'react';
import { useTheme } from './hooks/useTheme';
import { AppShell } from './components/layout/AppShell';
import { CompressView } from './views/CompressView';
import type { AppView } from './components/layout/TopBar';
import type { TokenizerKind } from './compression/types';
import { decodeState } from './lib/shareableUrl';

const loadCompareView = () => import('./views/CompareView');
const loadSettingsView = () => import('./views/SettingsView');
const loadReferenceView = () => import('./views/ReferenceView');
const loadLlmCompressView = () => import('./views/LlmCompressView');

const CompareView = lazy(() => loadCompareView().then((module) => ({ default: module.CompareView })));
const SettingsView = lazy(() => loadSettingsView().then((module) => ({ default: module.SettingsView })));
const ReferenceView = lazy(() => loadReferenceView().then((module) => ({ default: module.ReferenceView })));
const LlmCompressView = lazy(() => loadLlmCompressView().then((module) => ({ default: module.LlmCompressView })));

const VIEW_PRELOADERS: Partial<Record<AppView, () => Promise<unknown>>> = {
  compare: loadCompareView,
  settings: loadSettingsView,
  reference: loadReferenceView,
  'llm-compress': loadLlmCompressView,
};

const URL_STATE = (() => {
  try {
    return typeof window !== 'undefined' ? decodeState(window.location.search) : null;
  } catch {
    return null;
  }
})();

export default function App() {
  const [view, setView] = useState<AppView>('compress');
  const [theme, toggleTheme] = useTheme();
  const [tokenizer, setTokenizer] = useState<TokenizerKind>(URL_STATE?.tokenizer ?? 'approx-generic');
  const [targetTokens, setTargetTokens] = useState<string>(URL_STATE?.targetTokens ?? '');
  const [allowUnsafeTransforms, setAllowUnsafeTransforms] = useState(URL_STATE?.allowUnsafeTransforms ?? false);

  function preloadView(nextView: AppView) {
    VIEW_PRELOADERS[nextView]?.().catch(() => {
      /* ignore preload failures and retry on actual navigation */
    });
  }

  function resetAppSettings() {
    setTokenizer('approx-generic');
    setTargetTokens('');
    setAllowUnsafeTransforms(false);
  }

  return (
    <AppShell
      view={view}
      onViewChange={setView}
      onViewPreload={preloadView}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      <div className={view === 'compress' ? 'h-full' : 'hidden'}>
        <CompressView
          tokenizer={tokenizer}
          targetTokens={targetTokens}
          allowUnsafeTransforms={allowUnsafeTransforms}
          setAllowUnsafeTransforms={setAllowUnsafeTransforms}
          onResetAppSettings={resetAppSettings}
        />
      </div>
      <Suspense fallback={<ViewFallback />}>
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
      </Suspense>
    </AppShell>
  );
}

function ViewFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
      Loading view…
    </div>
  );
}
