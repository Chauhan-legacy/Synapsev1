import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileCode, Copy, Check } from 'lucide-react';

interface ExportBarProps {
  title: string;
  data: unknown;
  csvContent?: string;
  onExportPng?: () => void;
}

export const ExportBar: React.FC<ExportBarProps> = ({
  title,
  data,
  csvContent,
  onExportPng,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_table.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center justify-between text-xs py-2 px-3 surface-subtle border rounded-md my-3 no-print">
      <span className="text-muted font-medium">Export {title} Results:</span>
      <div className="flex items-center gap-2">
        {onExportPng && (
          <button
            type="button"
            onClick={onExportPng}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded surface-base border text-secondary hover:text-primary transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Chart PNG</span>
          </button>
        )}

        {csvContent && (
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded surface-base border text-secondary hover:text-primary transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Table CSV</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDownloadJson}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded surface-base border text-secondary hover:text-primary transition-colors"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>JSON</span>
        </button>

        <button
          type="button"
          onClick={handleCopyJson}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded surface-base border text-secondary hover:text-primary transition-colors"
          title="Copy JSON to Clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};

