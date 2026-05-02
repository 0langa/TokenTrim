import type { CompressionResult } from '../compression/types';
import { createCompressionReport } from '../compression/reporting';

interface StatProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

function Stat({ label, value, sub, accent }: StatProps) {
  return (
    <div className="rounded-lg bg-slate-800 p-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono font-semibold text-sm ${accent ? 'text-violet-300' : 'text-slate-100'}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Mode" value={report.mode} />
        <Stat label="Use case" value={report.profile ?? 'general'} />
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
        <div className="rounded-lg bg-slate-800 p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Token Budget</div>
          <div className="font-mono text-slate-200">
            Target: {report.targetTokens.toLocaleString()} · Output: {report.output.tokens.toLocaleString()} ·{' '}
            {report.budgetReached ? (
              <span className="text-green-400">Budget reached</span>
            ) : (
              <span className="text-amber-400">Budget not reached</span>
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
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <span className="text-slate-600">TokenTrim v{report.version} · all processing ran locally</span>
        <button
          onClick={onDownload}
          className="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-slate-200"
          title="Download full JSON report with all metrics, safety issues, and transform details"
        >
          Download report JSON
        </button>
      </div>
    </div>
  );
}
