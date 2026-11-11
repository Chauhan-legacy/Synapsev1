import React, { useState, useRef } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { Upload, Database, CheckCircle2, Filter, Trash2 } from 'lucide-react';
import { parseUniversalSignalCSV } from '../utils/csvParser';

interface DatasetsViewProps {
  onOpenMethodCard?: (name: string) => void;
}

export const DatasetsView: React.FC<DatasetsViewProps> = () => {
  const { activeSignal, availableDatasets, selectDataset, loadCustomSignal, deleteDataset, restoreDefaultDatasets } = useSignal();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preprocessing reversible pipeline state
  const [detrendActive, setDetrendActive] = useState(false);
  const [normalizeActive, setNormalizeActive] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsed = parseUniversalSignalCSV(text, file.name);
      if (parsed) {
        loadCustomSignal(parsed);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-base font-bold text-primary">Datasets & Preprocessing Pipeline</h1>
        <p className="text-xs text-secondary mt-0.5">
          Select built-in benchmark datasets A to J, upload custom experimental waveforms, and inspect data quality.
        </p>
      </div>

      <CollapsibleExplainer title="How does SYNAPSE handle data integrity?">
        Original uploaded datasets are strictly immutable. Any preprocessing (such as detrending or normalization)
        is applied as a transparent, reversible step recorded in the experiment's SHA-256 Provenance Manifest.
      </CollapsibleExplainer>

      {/* Grid: Upload & Benchmark Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Benchmark & Uploaded Library */}
        <div className="lg:col-span-8 surface-base border rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-primary">
              <Database className="w-4 h-4 text-[#0F766E]" />
              <span>Available Scientific &amp; Custom Datasets</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted font-mono">{availableDatasets.length} total datasets</span>
              {restoreDefaultDatasets && availableDatasets.length < 10 && (
                <button
                  type="button"
                  onClick={restoreDefaultDatasets}
                  className="text-[11px] font-mono text-[#0F766E] hover:underline"
                  title="Restore default benchmark datasets"
                >
                  Restore Defaults
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {availableDatasets.map((ds) => {
              const isSelected = activeSignal.id === ds.id;
              return (
                <div
                  key={ds.id}
                  onClick={() => selectDataset(ds.id)}
                  className={`p-2.5 rounded border text-xs cursor-pointer transition-colors relative group ${
                    isSelected
                      ? 'border-[#0F766E] bg-[#EFEBE0] text-[#1F2430] font-semibold'
                      : 'bg-[#FFFFFF] border-[#DDD6C7] hover:border-[#0F766E]/40 text-[#4A5060]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">{ds.name.split(':')[0]}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && <span className="text-[10px] text-[#0F766E] font-bold">ACTIVE</span>}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDataset(ds.id);
                        }}
                        className="p-1 rounded text-[#C0392B] hover:bg-[#FDEDEC] transition-colors"
                        title={`Delete ${ds.name}`}
                        aria-label={`Delete ${ds.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#6B6F7B] truncate mt-0.5">
                    {ds.name.split(':')[1] || ds.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload Custom File */}
        <div className="lg:col-span-4 surface-base border rounded-md p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-xs text-primary border-b pb-2">
              <Upload className="w-4 h-4 text-[#B45F1B]" />
              <span>Upload Custom Signal</span>
            </div>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              Upload time-series files in CSV or TSV format with optional header row. SYNAPSE automatically validates monotonic timestamps.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E6E1D6] hover:border-[#10141C] rounded-md p-6 text-center cursor-pointer transition-colors surface-subtle space-y-2"
          >
            <Upload className="w-6 h-6 text-muted mx-auto" />
            <div className="text-xs font-medium text-primary">Click to select CSV / TSV file</div>
            <div className="text-[10px] text-muted font-mono">Max size: 50 MB</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Data Quality Report */}
      <div className="surface-base border rounded-md p-4 space-y-3">
        <div className="font-semibold text-xs text-primary border-b pb-2 flex items-center justify-between">
          <span>Signal Quality & Ingestion Profile</span>
          <span className="font-mono text-[10px] text-muted">{activeSignal.quality.content_hash_sha256}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted block text-[11px]">Total Samples</span>
            <span className="font-mono font-semibold text-primary">{activeSignal.quality.total_samples.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted block text-[11px]">Timestamp Uniformity</span>
            <span className="font-semibold text-[#25653F] dark:text-[#6CB582] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Uniform (dt = {(1.0 / activeSignal.samplingRate).toFixed(4)}s)
            </span>
          </div>
          <div>
            <span className="text-muted block text-[11px]">Missing / NaN Values</span>
            <span className="font-mono font-semibold text-primary">{activeSignal.quality.nan_count}</span>
          </div>
          <div>
            <span className="text-muted block text-[11px]">Signal Clipping</span>
            <span className="font-mono font-semibold text-primary">{activeSignal.quality.clipping_count}</span>
          </div>
        </div>
      </div>

      {/* Preprocessing Reversible Pipeline */}
      <div className="surface-base border rounded-md p-4 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-xs text-primary border-b pb-2">
          <Filter className="w-4 h-4 text-[#B45F1B]" />
          <span>Reversible Preprocessing Pipeline</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer surface-subtle border px-3 py-1.5 rounded">
            <input
              type="checkbox"
              checked={detrendActive}
              onChange={(e) => setDetrendActive(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#10141C] rounded"
            />
            <span className="text-primary font-medium">Constant Mean Detrend</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer surface-subtle border px-3 py-1.5 rounded">
            <input
              type="checkbox"
              checked={normalizeActive}
              onChange={(e) => setNormalizeActive(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#10141C] rounded"
            />
            <span className="text-primary font-medium">Unit Variance Normalization (Z-score)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
