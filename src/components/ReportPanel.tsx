import type { CompressionResult } from '../compression/types';
import { createCompressionReport } from '../compression/reporting';
import { getModeMeta } from '../compression/modes';
import { PROFILE_META } from '../compression/profiles';

interface StatProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

function Stat({ label, value, sub, accent }: StatProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`font-mono text-sm font-semibold ${accent ? 'text-violet-700 dark:text-violet-300' : 'text-slate-900 dark:text-slate-100'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

interface Props {
  result: CompressionResult;
  onDownload: () => void;
}

export function ReportPanel({ result, onDownload }: Props) {
  const report = createCompressionReport(result);
  const tokenPct = Math.round(report.savings.tokenPercent);
  const charPct =
    report.input.chars > 0 ? Math.round((report.savings.chars / report.input.chars) * 100) : 0;
  const profileLabel = report.profile ? PROFILE_META[report.profile].label : PROFILE_META.general.label;
  const modeLabel = getModeMeta(report.mode).label;

  return (
    <div className="p-4 text-xs space-y-3 overflow-auto">
      {/* Savings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat
          label="~Tokens saved"
          value={`−${report.savings.tokens.toLocaleString()}`}
          sub={`${tokenPct}% reduction`}
          accent={tokenPct > 0}
        />
        <Stat
          label="Chars saved"
          value={`−${report.savings.chars.toLocaleString()}`}
          sub={`${charPct}% reduction`}
        />
        <Stat label="~Tokens in" value={report.input.tokens.toLocaleString()} />
        <Stat label="~Tokens out" value={report.output.tokens.toLocaleString()} />
      </div>

      {/* Settings */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Mode" value={modeLabel} />
        <Stat label="Text type" value={profileLabel} />
        <Stat
          label="Runtime"
          value={report.durationMs !== undefined ? `${report.durationMs.toFixed(1)}ms` : '–'}
        />
        <Stat
          label="Token counter"
          value={report.tokenizer}
          sub={report.tokenizerExact ? 'exact' : 'approximate (~)'}
        />
      </div>

      {/* Budget */}
      {report.targetTokens !== undefined && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Token Budget</div>
          <div className="font-mono text-slate-700 dark:text-slate-200">
            Target: {report.targetTokens.toLocaleString()} · Output: {report.output.tokens.toLocaleString()} ·{' '}
            {report.budgetReached ? (
              <span className="text-green-600 dark:text-green-400">Budget reached</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">Budget not reached</span>
            )}
          </div>
        </div>
      )}

      {/* Quality summary */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Transforms applied" value={String(report.transforms.length)} />
        <Stat
          label="Rejected transforms"
          value={String(report.rejectedTransforms.length)}
          sub={report.rejectedTransforms.length > 0 ? 'not applied to output' : undefined}
        />
        <Stat
          label="Safety issues"
          value={String(report.safetyIssues.length)}
          sub={report.safetyIssues.length === 0 ? 'all passed' : undefined}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
        <span className="text-slate-500 dark:text-slate-400">TokenTrim v{report.version} · all processing ran locally</span>
        <button
          onClick={onDownload}
          className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          title="Download full JSON report with all metrics, safety issues, and transform details"
        >
          Download report JSON
        </button>
      </div>
    </div>
  );
}
