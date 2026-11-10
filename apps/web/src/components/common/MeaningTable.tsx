import React from 'react';
import { CommonResultSchema, FindingStatus } from '../../types/analysis';
import { ExternalLink, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface MeaningTableProps {
  results: CommonResultSchema[];
  onOpenMethodCard?: (methodName: string) => void;
}

export const MeaningTable: React.FC<MeaningTableProps> = ({
  results,
  onOpenMethodCard,
}) => {
  const renderStatusBadge = (status: FindingStatus) => {
    switch (status) {
      case 'supported':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-[#E8EFE9] text-[#25653F] border border-[#CDE0D0] dark:bg-[#1A261D] dark:text-[#6CB582] dark:border-[#2C4232]">
            <CheckCircle2 className="w-3 h-3 text-[#25653F] dark:text-[#6CB582]" />
            <span>supported</span>
          </span>
        );
      case 'inconclusive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-[#FDF3E7] text-[#964E14] border border-[#F5DFC6] dark:bg-[#2A2016] dark:text-[#D48B47] dark:border-[#473420]">
            <AlertTriangle className="w-3 h-3 text-[#964E14] dark:text-[#D48B47]" />
            <span>inconclusive</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-[#FBEAE8] text-[#8C2C1E] border border-[#F5C6C2] dark:bg-[#2B1B19] dark:text-[#D87063] dark:border-[#4A2925]">
            <XCircle className="w-3 h-3 text-[#8C2C1E] dark:text-[#D87063]" />
            <span>rejected</span>
          </span>
        );
      case 'not_run':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-[#F2EFE9] text-[#57534E] border border-[#E6E1D6] dark:bg-[#1E232B] dark:text-[#94A3B8] dark:border-[#2E3642]">
            <Clock className="w-3 h-3" />
            <span>Not run</span>
          </span>
        );
    }
  };

  const formatEstimate = (estimate: number | Record<string, number>) => {
    if (typeof estimate === 'number') {
      return estimate.toLocaleString('en-US', { maximumFractionDigits: 4 });
    }
    return Object.entries(estimate)
      .map(([k, v]) => `${k}: ${v.toFixed(3)}`)
      .join(', ');
  };

  return (
    <div className="overflow-x-auto w-full border rounded-md surface-base">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="surface-subtle border-b font-medium text-muted uppercase tracking-wider">
            <th className="py-2.5 px-3">Method & Version</th>
            <th className="py-2.5 px-3 text-right">Estimate</th>
            <th className="py-2.5 px-3 text-right">95% Uncertainty</th>
            <th className="py-2.5 px-3 text-right">p-value</th>
            <th className="py-2.5 px-3">Status</th>
            <th className="py-2.5 px-3 min-w-[240px]">Meaning (Scientific Interpretation)</th>
            <th className="py-2.5 px-3 text-right">Card</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
          {results.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-6 text-center text-muted font-sans">
                No analysis executions recorded. Click "Run analysis" to compute metrics.
              </td>
            </tr>
          ) : (
            results.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="py-2 px-3 font-sans font-medium text-primary">
                  <div>{row.method}</div>
                  <div className="text-[10px] text-muted">v{row.version}</div>
                </td>

                <td className="py-2 px-3 text-right text-primary tabular-nums">
                  {formatEstimate(row.estimate)}
                </td>

                <td className="py-2 px-3 text-right text-secondary tabular-nums">
                  {row.uncertainty ? (
                    `[${row.uncertainty.ci_low.toFixed(3)}, ${row.uncertainty.ci_high.toFixed(3)}]`
                  ) : (
                    <span className="text-muted font-sans">—</span>
                  )}
                </td>

                <td className="py-2 px-3 text-right tabular-nums">
                  {row.test ? (
                    <div>
                      <span className={row.test.p_raw < 0.05 ? 'text-primary font-semibold' : 'text-muted'}>
                        {row.test.p_raw < 0.001 ? '< 0.001' : row.test.p_raw.toFixed(4)}
                      </span>
                      {row.test.p_adjusted !== undefined && (
                        <div className="text-[10px] text-muted">
                          adj: {row.test.p_adjusted < 0.001 ? '< 0.001' : row.test.p_adjusted.toFixed(4)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted font-sans">—</span>
                  )}
                </td>

                <td className="py-2 px-3 font-sans">
                  {renderStatusBadge(row.status)}
                </td>

                <td className="py-2 px-3 font-sans text-secondary text-xs leading-normal">
                  {row.meaning}
                </td>

                <td className="py-2 px-3 text-right font-sans">
                  {onOpenMethodCard && (
                    <button
                      type="button"
                      onClick={() => onOpenMethodCard(row.method)}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 p-1 rounded"
                      title={`Open method card for ${row.method}`}
                      aria-label={`Open method card for ${row.method}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

