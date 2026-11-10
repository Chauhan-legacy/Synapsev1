import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { InteractiveChart } from '../components/common/InteractiveChart';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { BookmarkPlus } from 'lucide-react';

export const ExplorerView: React.FC = () => {
  const { activeSignal } = useSignal();
  const [selectedChannel, setSelectedChannel] = useState<string>(activeSignal.channelNames[0]);
  const [annotations, setAnnotations] = useState<Array<{ time: number; note: string }>>([]);
  const [newNote, setNewNote] = useState('');

  const vals = activeSignal.channels[selectedChannel] || [];
  const times = activeSignal.timestamps || [];

  const handleAddAnnotation = () => {
    if (!newNote.trim()) return;
    const midTime = times[Math.floor(times.length / 2)] || 0;
    setAnnotations([...annotations, { time: midTime, note: newNote }]);
    setNewNote('');
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-base font-bold text-primary">Signal Explorer & Microstructure Inspection</h1>
          <p className="text-xs text-secondary mt-0.5">
            Full-resolution interactive zooming, mouse wheel magnification, multi-channel overlays, and manual annotations.
          </p>
        </div>

        {/* Channel Switcher */}
        {activeSignal.channelNames.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="text-xs surface-subtle border rounded px-2 py-1 text-primary focus:outline-none"
            >
              {activeSignal.channelNames.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <CollapsibleExplainer title="How to use the Signal Explorer?">
        Scroll with your mouse wheel or use the zoom controls to inspect individual cycles. Double-click the chart canvas
        to reset back to the full time span. Markers highlight detected peaks and regime shifts.
      </CollapsibleExplainer>

      {/* Main Interactive Chart */}
      <InteractiveChart
        title={`${activeSignal.filename} — ${selectedChannel}`}
        xValues={times}
        xLabel="Time (seconds)"
        yLabel="Observed Value"
        series={[{ name: selectedChannel, data: vals }]}
        accessibleSummary={`Full resolution inspection of ${selectedChannel} across ${times.length} samples`}
        height={320}
      />

      <ExportBar title="Signal Explorer" data={{ filename: activeSignal.filename, channel: selectedChannel }} />

      {/* Manual Annotations Bar */}
      <div className="surface-base border rounded-md p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <BookmarkPlus className="w-3.5 h-3.5 text-blue-600" />
          <span>Add Scientific Annotation</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type an observation note (e.g., 'Transient dip at t=4.5s')..."
            className="flex-1 surface-subtle border rounded px-3 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <button
            type="button"
            onClick={handleAddAnnotation}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Add Note
          </button>
        </div>

        {annotations.length > 0 && (
          <div className="divide-y text-xs pt-2">
            {annotations.map((ann, idx) => (
              <div key={idx} className="py-1.5 flex items-center justify-between text-secondary">
                <span>{ann.note}</span>
                <span className="font-mono text-muted text-[11px]">t ~ {ann.time.toFixed(2)}s</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
