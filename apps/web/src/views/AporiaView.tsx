import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Feather,
  Plus,
  Trash2,
  Download,
  Search,
  Calendar,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export interface AporiaEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

const STORAGE_KEY_ENTRIES = 'synapse_aporia_entries_v1';
const STORAGE_KEY_ACTIVE_ID = 'synapse_aporia_active_id_v1';

// Initial welcoming entry
const INITIAL_DEFAULT_ENTRY: AporiaEntry = {
  id: 'aporia-welcome-entry',
  title: 'Some thoughts deserve a place to stay',
  content: `In the rush of signals, spectra, and calculations, some observations refuse to fit neatly into a matrix or a confidence interval.

Synthesized Thoughts is a quiet clearing at the edge of the laboratory. It is not an instrument, nor a telemetry logger, nor a database of verified truths. It is a private parchment for the thoughts that arise while the sensors run: the unexpected hunch, the philosophical doubt, the intuition you are not yet ready to defend before a seminar, and the reflections that belong only to you.

Here, words rest on sage stationery in deep forest ink. Nothing is uploaded to any cloud; no telemetry is sent to any server; no artificial intellect summarizes your sentences.

Write without hurry. Revisit what was thought in quiet hours. And when an idea is ready to leave these pages, export it as an editorial folio.

"Some thoughts deserve a place to stay."`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const AporiaView: React.FC = () => {
  // --- State ---
  const [entries, setEntries] = useState<AporiaEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ENTRIES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse stored Aporia entries:', err);
    }
    return [INITIAL_DEFAULT_ENTRY];
  });

  const [activeEntryId, setActiveEntryId] = useState<string>(() => {
    try {
      const storedId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      if (storedId) return storedId;
    } catch {
      // ignore
    }
    return INITIAL_DEFAULT_ENTRY.id;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'compact'>('normal');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<'png' | 'jpeg' | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  // Active Entry
  const activeEntry = useMemo(() => {
    return entries.find((e) => e.id === activeEntryId) || entries[0] || null;
  }, [entries, activeEntryId]);

  // Ensure active entry is valid
  useEffect(() => {
    if (!activeEntry && entries.length > 0) {
      setActiveEntryId(entries[0].id);
    }
  }, [activeEntry, entries]);

  // Persist entries to localStorage whenever they change
  const persistEntries = useCallback((newEntries: AporiaEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(newEntries));
    } catch (err) {
      console.error('Failed to save Aporia entries to localStorage:', err);
    }
  }, []);

  // Persist active ID
  useEffect(() => {
    if (activeEntryId) {
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeEntryId);
      } catch {
        // ignore
      }
    }
  }, [activeEntryId]);

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  // Debounced autosave mechanism
  const queueAutosave = useCallback(
    (updatedEntry: AporiaEntry) => {
      setSaveStatus('saving');
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = window.setTimeout(() => {
        setEntries((prev) => {
          const next = prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e));
          persistEntries(next);
          return next;
        });
        setSaveStatus('saved');
        setLastSavedTime(new Date());
      }, 400);
    },
    [persistEntries]
  );

  // Flush pending changes before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (autosaveTimeoutRef.current && activeEntry) {
        window.clearTimeout(autosaveTimeoutRef.current);
        persistEntries(entries);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [entries, activeEntry, persistEntries]);

  // Update Title
  const handleTitleChange = (newTitle: string) => {
    if (!activeEntry) return;
    const updated: AporiaEntry = {
      ...activeEntry,
      title: newTitle,
      updatedAt: new Date().toISOString(),
    };
    // Update local state immediately for responsiveness
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    queueAutosave(updated);
  };

  // Update Content
  const handleContentChange = (newContent: string) => {
    if (!activeEntry) return;
    const updated: AporiaEntry = {
      ...activeEntry,
      content: newContent,
      updatedAt: new Date().toISOString(),
    };
    // Update local state immediately
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    queueAutosave(updated);
  };

  // Create New Entry
  const handleCreateEntry = () => {
    const now = new Date();
    const newEntry: AporiaEntry = {
      id: `aporia-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: '',
      content: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const next = [newEntry, ...entries];
    setEntries(next);
    persistEntries(next);
    setActiveEntryId(newEntry.id);
    setSaveStatus('saved');
    setLastSavedTime(now);

    // Focus title input
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
  };

  // Delete Entry
  const handleConfirmDelete = () => {
    if (!deleteModalId) return;
    const next = entries.filter((e) => e.id !== deleteModalId);
    setEntries(next);
    persistEntries(next);
    if (activeEntryId === deleteModalId) {
      if (next.length > 0) {
        setActiveEntryId(next[0].id);
      } else {
        // If all deleted, generate a fresh blank entry
        const blank: AporiaEntry = {
          id: `aporia-${Date.now()}`,
          title: '',
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setEntries([blank]);
        persistEntries([blank]);
        setActiveEntryId(blank.id);
      }
    }
    setDeleteModalId(null);
  };

  // Filtered entries for sidebar
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  // Word count & read time
  const stats = useMemo(() => {
    if (!activeEntry || !activeEntry.content) {
      return { words: 0, characters: 0, readingTimeMinutes: 0 };
    }
    const words = activeEntry.content.trim().split(/\s+/).filter(Boolean).length;
    const characters = activeEntry.content.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, characters, readingTimeMinutes };
  }, [activeEntry]);

  // Format Date cleanly
  const formatFullDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const formatShortDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  // =========================================================================
  // EXACT A4 HIGH-RESOLUTION IMAGE EXPORT ENGINE (Canvas 2D, Pure Client-Side)
  // Background Color: #82a18f (Sage Green A4 Sheet)
  // Aspect Ratio: 1 : 1.4142 (Exact ISO 216 A4)
  // =========================================================================
  const exportEntryAsImage = async (format: 'png' | 'jpeg') => {
    if (!activeEntry) return;
    setIsExporting(format);
    setIsExportMenuOpen(false);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Exact A4 dimensions in CSS pixels (1 : 1.4142)
      // Base A4: 1000px width x 1414px height per A4 page
      const a4BaseWidth = 1000;
      const a4PageHeight = 1414;
      const horizontalMargin = 90;
      const topMargin = 85;
      const bottomMargin = 85;
      const printableWidth = a4BaseWidth - horizontalMargin * 2; // 820px

      // Typography
      const displayFontFamily =
        "'Haboro Contrast', 'Playfair Display', 'Didot', 'Bodoni MT', 'Cinzel', 'Georgia', serif";
      const bodyFontFamily = "'Georgia', 'Cambria', 'Times New Roman', serif";

      const brandFontSize = 13;
      const titleFontSize = 32;
      const metaFontSize = 14;
      const bodyFontSize = 18;
      const bodyLineHeight = 31;
      const paragraphSpacing = 20;
      const footerFontSize = 13;

      // Dummy offscreen canvas for text wrapping measurement
      const measureCanvas = document.createElement('canvas');
      const mctx = measureCanvas.getContext('2d')!;

      // 1. Measure and wrap title
      const titleText = activeEntry.title.trim() || 'Untitled Reflection';
      mctx.font = `bold ${titleFontSize}px ${displayFontFamily}`;
      const titleWords = titleText.split(/\s+/);
      const titleLines: string[] = [];
      let currentTitleLine = '';

      for (const w of titleWords) {
        const testLine = currentTitleLine ? `${currentTitleLine} ${w}` : w;
        if (mctx.measureText(testLine).width > printableWidth && currentTitleLine) {
          titleLines.push(currentTitleLine);
          currentTitleLine = w;
        } else {
          currentTitleLine = testLine;
        }
      }
      if (currentTitleLine) titleLines.push(currentTitleLine);

      // 2. Measure and wrap body paragraphs
      mctx.font = `${bodyFontSize}px ${bodyFontFamily}`;
      const rawBlocks = activeEntry.content.split('\n');
      const formattedBlocks: string[][] = [];

      for (const block of rawBlocks) {
        const trimmed = block.trim();
        if (!trimmed) {
          formattedBlocks.push([]);
          continue;
        }

        const words = trimmed.split(/\s+/);
        const blockLines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const test = currentLine ? `${currentLine} ${word}` : word;
          if (mctx.measureText(test).width > printableWidth && currentLine) {
            blockLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = test;
          }
        }
        if (currentLine) blockLines.push(currentLine);
        formattedBlocks.push(blockLines);
      }

      // 3. Compute dynamic content height and calculate total required A4 pages
      let contentHeight = 0;
      for (const blockLines of formattedBlocks) {
        if (blockLines.length === 0) {
          contentHeight += paragraphSpacing;
        } else {
          contentHeight += blockLines.length * bodyLineHeight + 12;
        }
      }

      const headerHeight = 55;
      const titleTotalHeight = titleLines.length * (titleFontSize * 1.3) + 16;
      const metaTotalHeight = 36;
      const ruleHeight = 26;
      const footerTotalHeight = 60;

      const rawTotalHeight =
        topMargin +
        headerHeight +
        titleTotalHeight +
        metaTotalHeight +
        ruleHeight +
        contentHeight +
        footerTotalHeight +
        bottomMargin;

      // Fit to full A4 page multiples so exported document is ALWAYS an exact A4 sheet!
      const pageCount = Math.max(1, Math.ceil(rawTotalHeight / a4PageHeight));
      const totalA4Height = pageCount * a4PageHeight;

      // 4. Create high-resolution master canvas at 2x scale
      const scaleFactor = 2.0;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(a4BaseWidth * scaleFactor);
      canvas.height = Math.round(totalA4Height * scaleFactor);

      const ctx = canvas.getContext('2d', { alpha: false })!;
      ctx.scale(scaleFactor, scaleFactor);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // --- Draw the A4 Page Background in EXACT HEX #82a18f ---
      ctx.fillStyle = '#82a18f';
      ctx.fillRect(0, 0, a4BaseWidth, totalA4Height);

      // Subtle editorial A4 inner border
      ctx.strokeStyle = 'rgba(15, 33, 23, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(30, 30, a4BaseWidth - 60, totalA4Height - 60);

      // Top running header
      let currentY = topMargin;

      ctx.font = `600 ${brandFontSize}px ${displayFontFamily}`;
      ctx.fillStyle = '#0F2217'; // Deep Forest Ink
      ctx.fillText('SYNTHESIZED THOUGHTS', horizontalMargin, currentY);

      ctx.font = `italic ${brandFontSize}px ${bodyFontFamily}`;
      ctx.fillStyle = '#1A3826';
      const a4Tag = `DIARY • ${pageCount > 1 ? `1 of ${pageCount}` : 'FOLIO'}`;
      const tagWidth = ctx.measureText(a4Tag).width;
      ctx.fillText(a4Tag, a4BaseWidth - horizontalMargin - tagWidth, currentY);

      currentY += 16;

      // Hairline rule below A4 header
      ctx.strokeStyle = 'rgba(15, 33, 23, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(horizontalMargin, currentY);
      ctx.lineTo(a4BaseWidth - horizontalMargin, currentY);
      ctx.stroke();

      currentY += 45;

      // --- Title (Deep Forest Ink) ---
      ctx.font = `bold ${titleFontSize}px ${displayFontFamily}`;
      ctx.fillStyle = '#0C1E14';
      for (const tLine of titleLines) {
        ctx.fillText(tLine, horizontalMargin, currentY);
        currentY += titleFontSize * 1.3;
      }

      currentY += 6;

      // --- Date & Metadata ---
      ctx.font = `normal ${metaFontSize}px ${bodyFontFamily}`;
      ctx.fillStyle = '#183323';
      const dateStr = formatFullDate(activeEntry.createdAt);
      ctx.fillText(dateStr, horizontalMargin, currentY);

      if (stats.words > 0) {
        const statsStr = `${stats.words} words • ~${stats.readingTimeMinutes} min reflection`;
        const statsWidth = ctx.measureText(statsStr).width;
        ctx.fillStyle = '#22422F';
        ctx.fillText(statsStr, a4BaseWidth - horizontalMargin - statsWidth, currentY);
      }

      currentY += 20;

      // Editorial double divider rule
      ctx.strokeStyle = '#0C1E14';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(horizontalMargin, currentY);
      ctx.lineTo(horizontalMargin + 80, currentY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(15, 33, 23, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(horizontalMargin + 88, currentY);
      ctx.lineTo(a4BaseWidth - horizontalMargin, currentY);
      ctx.stroke();

      currentY += 36;

      // --- Body Text (Georgia Regular in Deep Dark Ink) ---
      ctx.font = `${bodyFontSize}px ${bodyFontFamily}`;
      ctx.fillStyle = '#0C1E14';

      for (const blockLines of formattedBlocks) {
        if (blockLines.length === 0) {
          currentY += paragraphSpacing;
        } else {
          for (const line of blockLines) {
            ctx.fillText(line, horizontalMargin, currentY);
            currentY += bodyLineHeight;
          }
          currentY += 12;
        }
      }

      // --- Footer at bottom of A4 Sheet ---
      const footerY = totalA4Height - bottomMargin;
      ctx.strokeStyle = 'rgba(15, 33, 23, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(horizontalMargin, footerY - 24);
      ctx.lineTo(a4BaseWidth - horizontalMargin, footerY - 24);
      ctx.stroke();

      ctx.font = `italic ${footerFontSize}px ${bodyFontFamily}`;
      ctx.fillStyle = '#183323';
      ctx.fillText('Some thoughts deserve a place to stay.', horizontalMargin, footerY);

      ctx.font = `normal ${footerFontSize}px ${bodyFontFamily}`;
      ctx.fillStyle = '#22422F';
      const colophonText = `Synthesized Thoughts • Synapse Core`;
      const colophonWidth = ctx.measureText(colophonText).width;
      ctx.fillText(colophonText, a4BaseWidth - horizontalMargin - colophonWidth, footerY);

      // 5. Convert to Blob & Trigger Local Download
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpeg' ? 0.94 : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Failed to create image blob from canvas');
            setIsExporting(null);
            return;
          }

          const safeTitle = (activeEntry.title.trim() || 'untitled-entry')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 40);

          const dateStamp = new Date(activeEntry.createdAt).toISOString().split('T')[0];
          const fileName = `synthesized-thoughts-${safeTitle}-${dateStamp}.${format === 'png' ? 'png' : 'jpg'}`;

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setIsExporting(null);
        },
        mimeType,
        quality
      );
    } catch (err) {
      console.error('Export error:', err);
      setIsExporting(null);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden text-[#1F2430] select-text"
      style={{
        backgroundColor: '#EAE5DC', // Neutral drafting desk surface
        fontFamily: "'Georgia', 'Cambria', 'Times New Roman', serif",
      }}
    >
      {/* Editorial Top Bar (Clean, Neutral Header) */}
      <header className="h-14 border-b border-[#D5CFC2] bg-[#FAF8F5] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-10 select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="p-1.5 rounded-md border border-[#D5CFC2] hover:border-[#82a18f] text-[#6B7280] hover:text-[#1F2430] hover:bg-[#F2ECE1] transition-colors"
            title={isSidebarOpen ? 'Collapse entries panel' : 'Show entries panel'}
          >
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white shadow-2xs"
              style={{ backgroundColor: '#82a18f' }}
            >
              <Feather className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-bold tracking-wider text-sm text-[#1F2430]"
                  style={{
                    fontFamily:
                      "'Haboro Contrast', 'Playfair Display', 'Didot', 'Bodoni MT', 'Cinzel', serif",
                  }}
                >
                  Synthesized Thoughts
                </span>
              </div>
              <p className="text-[11px] text-[#7A756B] hidden sm:block italic leading-none mt-0.5">
                Some thoughts deserve a place to stay.
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-3">
          {/* Autosave Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-[#7A756B]">
            {saveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[11px]">Saving...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#82a18f' }} />
                <span className="text-[11px] text-[#4A554E] font-medium">
                  Saved {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-[#D5CFC2]" />

          {/* Typography Scale Picker */}
          <div className="hidden sm:flex items-center rounded-md border border-[#D5CFC2] bg-[#FFFFFF] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFontSize('compact')}
              style={{
                backgroundColor: fontSize === 'compact' ? '#82a18f' : undefined,
                color: fontSize === 'compact' ? '#0A1C12' : undefined,
              }}
              className={`px-2 py-0.5 rounded ${fontSize !== 'compact' ? 'text-[#6B7280] hover:text-[#1F2430]' : 'font-semibold shadow-2xs'}`}
              title="Compact type (16px)"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize('normal')}
              style={{
                backgroundColor: fontSize === 'normal' ? '#82a18f' : undefined,
                color: fontSize === 'normal' ? '#0A1C12' : undefined,
              }}
              className={`px-2 py-0.5 rounded ${fontSize !== 'normal' ? 'text-[#6B7280] hover:text-[#1F2430]' : 'font-semibold shadow-2xs'}`}
              title="Standard type (18px)"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize('large')}
              style={{
                backgroundColor: fontSize === 'large' ? '#82a18f' : undefined,
                color: fontSize === 'large' ? '#0A1C12' : undefined,
              }}
              className={`px-2 py-0.5 rounded ${fontSize !== 'large' ? 'text-[#6B7280] hover:text-[#1F2430]' : 'font-semibold shadow-2xs'}`}
              title="Editorial large type (21px)"
            >
              A+
            </button>
          </div>

          {/* Focus Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsFocusMode((prev) => !prev)}
            style={{
              backgroundColor: isFocusMode ? '#82a18f' : undefined,
              color: isFocusMode ? '#0A1C12' : undefined,
              borderColor: isFocusMode ? '#82a18f' : '#D5CFC2',
            }}
            className={`p-1.5 rounded-md border text-xs transition-colors flex items-center gap-1.5 ${
              !isFocusMode ? 'text-[#4A554E] hover:border-[#82a18f] hover:bg-[#F2ECE1] bg-white' : 'font-semibold'
            }`}
            title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode (distraction-free)'}
          >
            {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isFocusMode ? 'Exit Focus' : 'Focus'}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              disabled={isExporting !== null}
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              style={{ backgroundColor: '#82a18f', color: '#0A1C12' }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:brightness-95 font-semibold text-xs shadow-2xs transition-all disabled:opacity-50 border border-black/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? `Exporting...` : 'Export'}</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-md bg-white border border-[#D5CFC2] shadow-xl py-1 z-30 font-sans text-xs">
                <div
                  className="px-3 py-1.5 border-b border-[#E8E2D5] text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: '#2B4A37' }}
                >
                  Export Folio Image
                </div>
                <button
                  type="button"
                  onClick={() => exportEntryAsImage('png')}
                  className="w-full text-left px-3 py-2 hover:bg-[#F6F4ED] text-[#1F2430] flex flex-col gap-0.5 transition-colors"
                >
                  <span className="font-semibold text-[#1F2430] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#82a18f' }} />
                    PNG Image (Lossless 2x)
                  </span>
                  <span className="text-[10px] text-[#7A756B] pl-4">
                    High-resolution image rendered on sage paper
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => exportEntryAsImage('jpeg')}
                  className="w-full text-left px-3 py-2 hover:bg-[#F6F4ED] text-[#1F2430] flex flex-col gap-0.5 transition-colors border-t border-[#F0ECE4]"
                >
                  <span className="font-semibold text-[#1F2430] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#82a18f' }} />
                    JPG / JPEG Image (Editorial)
                  </span>
                  <span className="text-[10px] text-[#7A756B] pl-4">
                    Balanced image size for sharing and presentations
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar: Entries & Search */}
        {isSidebarOpen && !isFocusMode && (
          <aside className="w-72 sm:w-80 border-r border-[#D5CFC2] bg-[#FAF8F5] flex flex-col shrink-0 overflow-hidden select-none">
            {/* Sidebar Actions */}
            <div className="p-3 border-b border-[#D5CFC2] flex flex-col gap-2 bg-[#F2ECE1]">
              <button
                type="button"
                onClick={handleCreateEntry}
                style={{ backgroundColor: '#82a18f', color: '#0A1C12' }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md hover:brightness-95 font-semibold text-xs transition-all shadow-2xs border border-black/10"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Entry</span>
              </button>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reflections..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[#D5CFC2] bg-white text-xs text-[#1F2430] placeholder-[#9CA3AF] focus:outline-none focus:border-[#82a18f] transition-colors"
                />
              </div>
            </div>

            {/* Entries List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#EAE5DC]">
              {filteredEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#9CA3AF]">
                  <p>No matching reflections found.</p>
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const isSelected = entry.id === activeEntryId;
                  const previewSnippet =
                    entry.content.trim().replace(/\s+/g, ' ').substring(0, 75) ||
                    'Empty reflection...';
                  const title = entry.title.trim() || 'Untitled Reflection';

                  return (
                    <div
                      key={entry.id}
                      onClick={() => setActiveEntryId(entry.id)}
                      style={{
                        backgroundColor: isSelected ? 'rgba(130, 161, 143, 0.18)' : undefined,
                        borderLeft: isSelected ? '3px solid #82a18f' : '3px solid transparent',
                      }}
                      className={`group p-3 cursor-pointer transition-all relative ${
                        !isSelected ? 'hover:bg-white/60' : 'shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            isSelected ? 'text-[#0A1C12]' : 'text-[#374151]'
                          }`}
                          style={{
                            fontFamily:
                              "'Haboro Contrast', 'Playfair Display', 'Didot', 'Bodoni MT', 'Georgia', serif",
                          }}
                        >
                          {title}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalId(entry.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-600 transition-opacity"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: '#3A5C47' }}>
                        <span>{formatShortDate(entry.createdAt)}</span>
                        <span>&bull;</span>
                        <span className="text-[#7A756B]">
                          {entry.content.trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] text-[#6B7280] line-clamp-2 leading-relaxed font-serif">
                        {previewSnippet}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-[#D5CFC2] bg-[#F2ECE1] text-[10px] text-[#7A756B] flex items-center justify-between">
              <span>{entries.length} reflections stored</span>
              <span className="font-semibold text-[#2D4D3A]">100% Offline</span>
            </div>
          </aside>
        )}

        {/* Main Writing Desk Surface (Neutral Wood/Matte Backdrop) */}
        <main
          className="flex-1 flex flex-col items-center min-w-0 overflow-y-auto px-4 py-8 sm:py-12"
          style={{ backgroundColor: '#EAE5DC' }}
        >
          {activeEntry ? (
            /* ============================================================= */
            /* THE EXACT A4 PAGE SHEET COLORED IN HEX #82a18f                */
            /* Dimensions: Standard ISO 216 A4 (210mm x 297mm -> 1:1.4142)    */
            /* ============================================================= */
            <div
              className="w-full rounded-sm transition-all relative flex flex-col"
              style={{
                maxWidth: '794px', // Exact A4 96-DPI pixel width
                minHeight: '1123px', // Exact A4 96-DPI pixel height (794 * 1.4142)
                backgroundColor: '#82a18f', // EXACT HEX USER REQUIRED
                color: '#0C1E14', // Deep Dark Forest Ink
                padding: '48px 56px',
                boxShadow:
                  '0 20px 50px -10px rgba(18, 32, 24, 0.38), 0 2px 10px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(15, 33, 23, 0.2)',
              }}
            >
              {/* Running Page Header */}
              <div
                className="flex items-center justify-between border-b pb-3 mb-6 select-none"
                style={{ borderColor: 'rgba(15, 33, 23, 0.22)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-bold tracking-widest uppercase"
                    style={{
                      fontFamily:
                        "'Haboro Contrast', 'Playfair Display', 'Didot', 'Bodoni MT', 'Georgia', serif",
                      color: '#0F2217',
                    }}
                  >
                    SYNTHESIZED THOUGHTS
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px]" style={{ color: '#1B3A28' }}>
                  <span>{stats.words} words</span>
                  <span>&bull;</span>
                  <span>~{stats.readingTimeMinutes} min read</span>
                </div>
              </div>

              {/* Editable Title on #82a18f */}
              <input
                ref={titleInputRef}
                type="text"
                value={activeEntry.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Title of reflection..."
                className="w-full bg-transparent border-none outline-none font-bold text-2xl sm:text-3xl placeholder-[#3A5846] mb-3 tracking-tight"
                style={{
                  fontFamily:
                    "'Haboro Contrast', 'Playfair Display', 'Didot', 'Bodoni MT', 'Cinzel', 'Georgia', serif",
                  color: '#0C1E14',
                }}
              />

              {/* Date & Metadata Bar */}
              <div className="flex items-center gap-2 text-xs mb-5" style={{ color: '#1A3826' }}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatFullDate(activeEntry.createdAt)}</span>
              </div>

              {/* Editorial Double Rule */}
              <div className="flex items-center gap-2 mb-6 select-none">
                <div className="w-16 h-0.5" style={{ backgroundColor: '#0C1E14' }} />
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(15, 33, 23, 0.25)' }} />
              </div>

              {/* Editable Writing Area (Georgia Regular in Deep Dark Ink on #82a18f) */}
              <textarea
                ref={textareaRef}
                value={activeEntry.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Some thoughts deserve a place to stay. Write freely on this A4 sheet..."
                className={`w-full flex-1 bg-transparent border-none outline-none resize-none placeholder-[#3A5846] leading-relaxed transition-all ${
                  fontSize === 'compact'
                    ? 'text-base leading-7'
                    : fontSize === 'large'
                    ? 'text-xl leading-9'
                    : 'text-lg leading-8'
                }`}
                style={{
                  fontFamily: "'Georgia', 'Cambria', 'Times New Roman', serif",
                  color: '#0C1E14',
                  minHeight: '750px',
                }}
              />

              {/* Running Page Footer */}
              <div
                className="mt-8 pt-4 border-t flex items-center justify-between text-xs select-none"
                style={{ borderColor: 'rgba(15, 33, 23, 0.22)' }}
              >
                <span className="italic" style={{ color: '#183323' }}>
                  "Some thoughts deserve a place to stay."
                </span>
                <span className="text-[10px]" style={{ color: '#22422F' }}>
                  Synthesized Thoughts &bull; Synapse Core
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#7A756B]">
              <Feather className="w-10 h-10 text-[#82a18f] mb-3" />
              <h3
                className="text-lg font-bold text-[#1F2430] mb-1"
                style={{
                  fontFamily:
                    "'Haboro Contrast', 'Playfair Display', 'Didot', 'Bodoni MT', 'Georgia', serif",
                }}
              >
                No Reflection Selected
              </h3>
              <p className="text-xs text-[#7A756B] max-w-sm mb-4">
                Choose an existing reflection from the left or begin a fresh page.
              </p>
              <button
                type="button"
                onClick={handleCreateEntry}
                style={{ backgroundColor: '#82a18f', color: '#0A1C12' }}
                className="px-4 py-2 rounded-md font-semibold text-xs hover:brightness-95 transition-all shadow-2xs border border-black/10"
              >
                Create New Entry
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-lg bg-white border border-[#D5CFC2] shadow-2xl p-6 select-none font-sans">
            <div className="flex items-center gap-3 text-amber-700 mb-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-[#1F2430]">Delete this A4 reflection?</h3>
            </div>
            <p className="text-xs text-[#4B5563] leading-relaxed mb-6 font-serif">
              This reflection will be permanently removed from your private local storage. This
              action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setDeleteModalId(null)}
                className="px-3.5 py-1.5 rounded-md border border-[#D5CFC2] text-[#374151] hover:bg-[#FAF8F5] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium transition-colors shadow-2xs"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AporiaView;
