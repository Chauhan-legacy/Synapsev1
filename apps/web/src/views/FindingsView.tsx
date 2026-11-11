import React, { useState, useMemo } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ChevronDown, ChevronUp, Download, Check, X } from 'lucide-react';
import { CommonResultSchema, FindingStatus } from '../types/analysis';

interface FindingsViewProps {
  onOpenMethodCard: (name: string) => void;
}

export const FindingsView: React.FC<FindingsViewProps> = ({ onOpenMethodCard }) => {
  const { activeSignal, resultsByModule } = useSignal();
  const [statusFilter, setStatusFilter] = useState<'all' | FindingStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Flatten all findings across modules
  const allFindings = useMemo(() => {
    const list: CommonResultSchema[] = [];
    Object.entries(resultsByModule).forEach(([modName, items]) => {
      items.forEach((item, idx) => {
        list.push({
          ...item,
          evidence_refs: item.evidence_refs || [`sha256_${modName}_${idx}`],
        });
      });
    });
    return list;
  }, [resultsByModule]);

  // Filtered list
  const filteredFindings = useMemo(() => {
    if (statusFilter === 'all') return allFindings;
    return allFindings.filter((f) => f.status === statusFilter);
  }, [allFindings, statusFilter]);

  const countSupported = allFindings.filter((f) => f.status === 'supported').length;
  const countInconclusive = allFindings.filter((f) => f.status === 'inconclusive').length;
  const countRejected = allFindings.filter((f) => f.status === 'rejected').length;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-base font-bold text-primary">Validated Scientific Findings &amp; Evidence</h1>
          <p className="text-xs text-secondary mt-0.5">
            Ranked findings verified against phase-randomized null models with false discovery control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const report = {
                title: 'SYNAPSE Scientific Discovery Report',
                dataset: activeSignal.filename,
                sampling_rate: activeSignal.samplingRate,
                timestamp: new Date().toISOString(),
                findings: allFindings,
              };
              const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `SYNAPSE_Scientific_Report_${activeSignal.filename}.json`;
              a.click();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2563eb] text-white rounded-md shadow-sm hover:bg-[#1d4ed8] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Investigation Report</span>
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="What are Scientific Findings in SYNAPSE?">
        Unlike ordinary analytical dashboards, SYNAPSE does not declare a pattern real until it passes multiple layers of
        evidence: an analytic test statistic, an empirical surrogate null distribution (such as IAAFT), and Benjamini-Hochberg
        FDR multiplicity correction. Every item in this list carries an explicit status:
        <strong>Supported</strong> (solid rejection of the null), <strong>Inconclusive</strong> (insufficient power or marginal p-value),
        or <strong>Rejected</strong> (consistent with the null model).
      </CollapsibleExplainer>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-[#DDD6C7] pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'all' ? 'bg-[#0F766E] text-white' : 'bg-[#EFEBE0] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            All Findings ({allFindings.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('supported')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'supported' ? 'bg-[#0F766E] text-white' : 'bg-[#EFEBE0] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            Supported ({countSupported})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inconclusive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'inconclusive' ? 'bg-[#0F766E] text-white' : 'bg-[#EFEBE0] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            Inconclusive ({countInconclusive})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'rejected' ? 'bg-[#0F766E] text-white' : 'bg-[#EFEBE0] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            Rejected ({countRejected})
          </button>
        </div>

        <span className="text-xs font-mono text-muted">
          Showing {filteredFindings.length} of {allFindings.length}
        </span>
      </div>

      {/* Findings List */}
      <div className="space-y-3 font-mono text-xs">
        {filteredFindings.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-md p-8 text-center text-muted">
            No findings currently match the selected status filter. Click "Run analysis" on the top bar to run all engines.
          </div>
        ) : (
          filteredFindings.map((f, idx) => {
            const isExpanded = expandedId === `${f.method}_${idx}`;
            return (
              <div
                key={`${f.method}_${idx}`}
                className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-md p-4 transition-all hover:border-[#0F766E]/40 space-y-3"
              >
                <div
                  className="flex items-start justify-between cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : `${f.method}_${idx}`)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          f.status === 'supported'
                            ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                            : f.status === 'inconclusive'
                            ? 'bg-[#FEF3C7] text-[#B7791F] border border-[#FDE68A]'
                            : 'bg-[#FDEDEC] text-[#C0392B] border border-[#FADBD8]'
                        }`}
                      >
                        {f.status}
                      </span>
                      <span className="font-sans font-bold text-sm text-primary">{f.method}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMethodCard(f.method);
                        }}
                        className="text-[10px] text-[#B45F1B] hover:underline ml-1 font-mono"
                      >
                        [Method Card]
                      </button>
                    </div>
                    <p className="font-sans text-xs text-secondary">{f.plain_language_summary}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary">
                        {typeof f.estimate === 'number'
                          ? f.estimate.toFixed(3)
                          : typeof f.estimate === 'string'
                          ? f.estimate
                          : JSON.stringify(f.estimate)}
                      </div>
                      <div className="text-[10px] text-muted">Estimate</div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted" />
                    )}
                  </div>
                </div>

                {/* Meaning Bar */}
                <div className="bg-surface-subtle p-3 rounded border text-secondary font-sans text-xs flex items-start gap-2">
                  <span className="font-bold text-primary shrink-0 font-mono text-[11px] uppercase">Scientific Meaning:</span>
                  <span>{f.meaning}</span>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pt-2 border-t space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-subtle/60 p-3 rounded">
                      <div>
                        <div className="text-muted text-[10px] uppercase">Test Statistic</div>
                        <div className="font-bold text-primary mt-0.5">
                          {f.test ? `${f.test.statistic.toFixed(2)}` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted text-[10px] uppercase">p-Value (Raw / Adj)</div>
                        <div className="font-bold text-primary mt-0.5">
                          {f.test ? `${f.test.p_raw.toFixed(4)} / ${f.test.p_adjusted?.toFixed(4) || '—'}` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted text-[10px] uppercase">Uncertainty CI</div>
                        <div className="font-bold text-primary mt-0.5">
                          {f.uncertainty
                            ? `[${f.uncertainty.ci_low.toFixed(2)}, ${f.uncertainty.ci_high.toFixed(2)}]`
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted text-[10px] uppercase">Runtime</div>
                        <div className="font-bold text-primary mt-0.5">{f.runtime_ms} ms</div>
                      </div>
                    </div>

                    {/* Diagnostics & Assumptions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded border bg-surface-base space-y-1">
                        <span className="font-bold text-primary uppercase text-[10px]">Diagnostics Checked:</span>
                        {f.diagnostics.map((d, dIdx) => (
                          <div key={dIdx} className="flex justify-between text-secondary">
                            <span>{d.name}:</span>
                            <span className={d.passed ? 'text-status-success font-semibold' : 'text-status-danger font-semibold'}>
                              {String(d.value)} {d.passed ? '(PASS)' : '(FAIL)'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded border bg-surface-base space-y-1">
                        <span className="font-bold text-primary uppercase text-[10px]">Assumptions Verified:</span>
                        {f.assumptions.map((a, aIdx) => (
                          <div key={aIdx} className="text-secondary flex items-center gap-1.5 text-xs">
                            {a.passed ? (
                              <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-status-danger shrink-0" />
                            )}
                            <span>{a.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FindingsView;
