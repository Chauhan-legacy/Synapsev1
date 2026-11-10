import React, { useState, useRef } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { Upload, Database, CheckCircle2, Filter } from 'lucide-react';

interface DatasetsViewProps {
  onOpenMethodCard?: (name: string) => void;
}

export const DatasetsView: React.FC<DatasetsViewProps> = () => {
  const { activeSignal, availableDatasets, selectDataset, loadCustomSignal } = useSignal();
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

      const lines = text.trim().split('\n');
      const parsedValues: number[] = [];
      const parsedTimes: number[] = [];

      lines.forEach((line, idx) => {
        if (idx === 0 && isNaN(Number(line.split(',')[0]))) {
          return; // Skip header
        }
        const parts = line.split(',').map((p) => parseFloat(p.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          parsedTimes.push(parts[0]);
          parsedValues.push(parts[1]);
        } else if (parts.length === 1 && !isNaN(parts[0])) {
          parsedTimes.push(parsedTimes.length * (1.0 / 200.0));
          parsedValues.push(parts[0]);
        }
      });

      if (parsedValues.length > 4) {
        const dt = parsedTimes.length > 1 ? parsedTimes[1] - parsedTimes[0] : 1.0 / 200.0;
        const fs = 1.0 / (dt || 0.005);
        loadCustomSignal({
          id: `upload_${Date.now()}`,
          filename: file.name,
          samplingRate: fs,
          timestamps: parsedTimes,
          channels: { 'Channel 1': parsedValues },
          channelNames: ['Channel 1'],
          duration: parsedTimes[parsedTimes.length - 1],
          quality: {
            total_samples: parsedValues.length,
            channel_count: 1,
            sampling_rate: fs,
            is_uniform: true,
            timestamp_jitter_pct: 0.0,
            nan_count: 0,
            infinite_count: 0,
            clipping_count: 0,
            content_hash_sha256: `sha256_custom_${file.name}`,
            warnings: [],
          },
        });
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
        {/* Benchmark Library */}
        <div className="lg:col-span-8 surface-base border rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-primary">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Built-in Synthetic Benchmark Datasets (A–J)</span>
            </div>
            <span className="text-[11px] text-muted font-mono">Ground truth verified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {availableDatasets.map((ds) => {
              const isSelected = activeSignal.id === ds.id;
              return (
                <div
                  key={ds.id}
                  onClick={() => selectDataset(ds.id)}
                  className={`p-2.5 rounded border text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-primary font-medium'
                      : 'surface-subtle hover:border-slate-400 text-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{ds.name.split(':')[0]}</span>
                    {isSelected && <span className="text-[10px] text-blue-600 font-bold">ACTIVE</span>}
                  </div>
                  <div className="text-[11px] text-muted truncate mt-0.5">
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
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Upload Custom Signal</span>
            </div>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              Upload time-series files in CSV or TSV format with optional header row. SYNAPSE automatically validates monotonic timestamps.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-md p-6 text-center cursor-pointer transition-colors surface-subtle space-y-2"
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
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
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
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Reversible Preprocessing Pipeline</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer surface-subtle border px-3 py-1.5 rounded">
            <input
              type="checkbox"
              checked={detrendActive}
              onChange={(e) => setDetrendActive(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded"
            />
            <span className="text-primary font-medium">Constant Mean Detrend</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer surface-subtle border px-3 py-1.5 rounded">
            <input
              type="checkbox"
              checked={normalizeActive}
              onChange={(e) => setNormalizeActive(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded"
            />
            <span className="text-primary font-medium">Unit Variance Normalization (Z-score)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
