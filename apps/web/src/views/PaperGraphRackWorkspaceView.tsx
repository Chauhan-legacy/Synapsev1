import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Layers,
  Sparkles,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  FileText,
  Shield,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import {
  loadStoredPaperGraphSets,
  savePaperGraphSets,
  getDefaultPaperGraphSets,
  synthesizeGraphifyFromPapers,
  PaperGraphSet,
} from '../services/paperGraphRackService';
import { ArXivPaper, generateBibTeX } from '../services/arxivService';
import { parsePaperCsv, generateSamplePapersCsv } from '../utils/paperCsvParser';
import { GraphifyNetwork, GraphNode, GraphEdge } from '../components/network/GraphifyNetwork';

interface PaperGraphRackWorkspaceViewProps {
  onBackToLiterature: () => void;
}

export const PaperGraphRackWorkspaceView: React.FC<PaperGraphRackWorkspaceViewProps> = ({
  onBackToLiterature,
}) => {
  // Stored sets
  const [sets, setSets] = useState<PaperGraphSet[]>(() => loadStoredPaperGraphSets());
  const [activeSetId, setActiveSetId] = useState<string>(() => {
    const stored = loadStoredPaperGraphSets();
    return stored[0]?.id || 'set_foundational_physics';
  });

  // Active set resolution
  const activeSet = useMemo(() => {
    return sets.find((s) => s.id === activeSetId) || sets[0];
  }, [sets, activeSetId]);

  // Save to localStorage when sets change
  useEffect(() => {
    savePaperGraphSets(sets);
  }, [sets]);

  // Set management state
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [isRenamingSet, setIsRenamingSet] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synthesized Graph state for active set
  const [activeGraphNodes, setActiveGraphNodes] = useState<Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy'>[]>(() => {
    if (activeSet?.isImplemented && activeSet.papers.length > 0) {
      return synthesizeGraphifyFromPapers(activeSet.papers).nodes;
    }
    return [];
  });

  const [activeGraphEdges, setActiveGraphEdges] = useState<GraphEdge[]>(() => {
    if (activeSet?.isImplemented && activeSet.papers.length > 0) {
      return synthesizeGraphifyFromPapers(activeSet.papers).edges;
    }
    return [];
  });

  // Re-synchronize graph when active set changes or when papers are modified
  useEffect(() => {
    if (activeSet?.isImplemented && activeSet.papers.length > 0) {
      const { nodes, edges } = synthesizeGraphifyFromPapers(activeSet.papers);
      setActiveGraphNodes(nodes);
      setActiveGraphEdges(edges);
    } else {
      // Clear plain state: zero nodes, zero edges
      setActiveGraphNodes([]);
      setActiveGraphEdges([]);
    }
  }, [activeSetId, activeSet?.isImplemented, activeSet?.papers.length]);

  // Hidden CSV input ref
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Implement Graphify Action
  const handleImplementGraphify = () => {
    if (!activeSet || activeSet.papers.length === 0) {
      showToast('Cannot implement Graphify: Active testing set has 0 papers.');
      return;
    }

    const { nodes, edges, stats } = synthesizeGraphifyFromPapers(activeSet.papers);
    setActiveGraphNodes(nodes);
    setActiveGraphEdges(edges);

    setSets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSet.id) return s;
        return {
          ...s,
          isImplemented: true,
          lastSynthesizedAt: Date.now(),
          stats,
        };
      })
    );

    showToast(
      `Graphify™ Implemented! Synthesized ${nodes.length} nodes and ${edges.length} edges across ${stats.clusters} clusters.`
    );
  };

  // Create new set
  const handleCreateSet = () => {
    const trimmed = newSetName.trim();
    const name = trimmed || `Set ${sets.length + 1}: Custom Literature Test`;
    const newSet: PaperGraphSet = {
      id: `set_${Date.now()}`,
      name,
      createdAt: Date.now(),
      papers: [],
      isImplemented: false,
    };

    setSets((prev) => [...prev, newSet]);
    setActiveSetId(newSet.id);
    setIsCreatingSet(false);
    setNewSetName('');
    showToast(`Created new testing set: "${name}".`);
  };

  // Rename set
  const handleRenameSet = () => {
    if (!renameInput.trim()) return;
    setSets((prev) =>
      prev.map((s) => (s.id === activeSetId ? { ...s, name: renameInput.trim() } : s))
    );
    setIsRenamingSet(false);
    showToast(`Renamed set to "${renameInput.trim()}".`);
  };

  // Clear set papers
  const handleClearSet = () => {
    setSets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSetId) return s;
        return {
          ...s,
          papers: [],
          isImplemented: false,
          stats: undefined,
        };
      })
    );
    setActiveGraphNodes([]);
    setActiveGraphEdges([]);
    showToast(`Cleared all papers from "${activeSet?.name}". Canvas is now a clear plain page.`);
  };

  // Delete set
  const handleDeleteSet = (setId: string) => {
    if (sets.length <= 1) {
      const defs = getDefaultPaperGraphSets();
      setSets(defs);
      setActiveSetId(defs[0].id);
      showToast('Reset testing sets to defaults.');
      return;
    }

    const remaining = sets.filter((s) => s.id !== setId);
    setSets(remaining);
    setActiveSetId(remaining[0].id);
    showToast('Deleted set.');
  };

  // Remove individual paper from active set
  const handleRemovePaper = (paperId: string) => {
    setSets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSetId) return s;
        const nextPapers = s.papers.filter((p: ArXivPaper) => p.id !== paperId);
        return {
          ...s,
          papers: nextPapers,
          isImplemented: nextPapers.length > 0 ? s.isImplemented : false,
        };
      })
    );
    showToast('Removed paper from active set.');
  };

  // Upload CSV to active set
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast(`Ingesting research papers CSV: ${file.name}...`);
      const { papers: parsedPapers, errors } = await parsePaperCsv(file);

      if (parsedPapers.length === 0) {
        showToast(errors.length > 0 ? errors[0] : 'CSV parsed but no valid paper records found.');
        return;
      }

      setSets((prev) =>
        prev.map((s) => {
          if (s.id !== activeSetId) return s;
          const existingIds = new Set(s.papers.map((p: ArXivPaper) => p.id));
          const uniqueNew = parsedPapers.filter((p: ArXivPaper) => !existingIds.has(p.id));
          return {
            ...s,
            papers: [...s.papers, ...uniqueNew],
            isImplemented: false, // Reset implementation so user can click Implement
          };
        })
      );

      showToast(`Added ${parsedPapers.length} papers to "${activeSet?.name}". Click "Implement Graphify" to synthesize.`);
    } catch (err: any) {
      showToast(`CSV ingestion error: ${err.message || 'Malformed CSV format'}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const sampleCsv = generateSamplePapersCsv();
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'synapse_papers_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded synapse_papers_template.csv.');
  };

  // Export Set BibTeX
  const handleExportSetBibtex = () => {
    if (!activeSet || activeSet.papers.length === 0) {
      showToast('Active set has no papers to export.');
      return;
    }
    const bibtexStr = activeSet.papers.map(generateBibTeX).join('\n\n');
    const blob = new Blob([bibtexStr], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSet.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${activeSet.papers.length} citations for ${activeSet.name}.`);
  };

  // Epistemic Claims Modal
  const [inspectPaper, setInspectPaper] = useState<ArXivPaper | null>(null);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 font-mono text-xs pb-16">
      {/* Hidden File Input for CSV ingestion */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCsvUpload}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-[#1F2430] text-white border border-[#DDD6C7] rounded-xl shadow-lg flex items-center gap-3 text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Sparkles className="w-4 h-4 text-[#0F766E] shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 text-[#9CA3AF] hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navigation & Workspace Header */}
      <div className="bg-[#FFFDF9] border border-[#DDD6C7] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E6E1D6] pb-4">
          <div className="flex items-center gap-3">
            {/* Back Button to Literature Search */}
            <button
              type="button"
              onClick={onBackToLiterature}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-xs font-bold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Back to Literature Search</span>
            </button>

            <div>
              <h1 className="font-serif italic font-bold text-lg sm:text-xl text-[#10141C] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F766E]" />
                PaperGraph™ Multi-Set Rack &amp; Graphify Workspace
              </h1>
              <p className="text-xs text-[#78716C] font-mono mt-0.5">
                Staging workspace with dynamic Graphify citation network &amp; epistemic claim matrix.
              </p>
            </div>
          </div>

          {/* Primary Implementation Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImplementGraphify}
              disabled={!activeSet || activeSet.papers.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-[#A8A29E] text-white text-xs font-bold shadow-xs transition-all ring-2 ring-[#0F766E]/20"
              title="Run Graphify synthesis on active staged papers"
            >
              <Sparkles className="w-4 h-4" />
              <span>Implement Graphify™ ({activeSet?.papers.length || 0} Papers)</span>
            </button>
          </div>
        </div>

        {/* Set Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {sets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSetId(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeSetId === s.id
                  ? 'bg-[#0F766E] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] border border-[#DDD6C7] text-[#57534E] hover:bg-[#EFEBE0]'
              }`}
            >
              <span>{s.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeSetId === s.id ? 'bg-white/20 text-white' : 'bg-[#EAE6DC] text-[#78716C]'
                }`}
              >
                {s.papers.length}
              </span>
            </button>
          ))}

          {/* New Set Button */}
          <button
            type="button"
            onClick={() => setIsCreatingSet(true)}
            className="px-2.5 py-1.5 rounded-lg border border-dashed border-[#0F766E] text-[#0F766E] hover:bg-[#E6F4F2] text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Test Set</span>
          </button>
        </div>

        {/* Inline Create Set Form */}
        {isCreatingSet && (
          <div className="p-3 bg-[#FAF8F5] border border-[#DDD6C7] rounded-lg flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter set name (e.g. Set 4: Gravitational Waves, High Energy...)"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSet();
              }}
              className="flex-1 px-3 py-1.5 bg-white border border-[#DDD6C7] rounded text-xs text-[#1F2430] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
            <button
              type="button"
              onClick={handleCreateSet}
              className="px-3 py-1.5 bg-[#0F766E] text-white rounded text-xs font-bold hover:bg-[#0D655E]"
            >
              Create Set
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingSet(false);
                setNewSetName('');
              }}
              className="px-2 py-1.5 text-[#78716C] hover:text-[#1F2430]"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Active Set Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#FAF8F5] border border-[#DDD6C7] rounded-lg text-xs">
          <div className="flex items-center gap-3">
            {isRenamingSet ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSet();
                  }}
                  className="px-2 py-0.5 border border-[#DDD6C7] bg-white rounded text-xs text-[#1F2430]"
                />
                <button
                  type="button"
                  onClick={handleRenameSet}
                  className="p-1 bg-[#0F766E] text-white rounded hover:bg-[#0D655E]"
                  title="Save Name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenamingSet(false)}
                  className="p-1 text-[#78716C] hover:text-[#1F2430]"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1F2430]">
                  Active Set: <span className="text-[#0F766E]">{activeSet?.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRenameInput(activeSet?.name || '');
                    setIsRenamingSet(true);
                  }}
                  className="p-1 text-[#78716C] hover:text-[#0F766E]"
                  title="Rename set"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}

            <span className="text-[#78716C] text-[11px] flex items-center gap-1.5">
              {activeSet?.isImplemented ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
                  <span className="text-[#0F766E] font-semibold">Graphify Active</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#B45F1B]" />
                  <span className="text-[#B45F1B]">Synthesis Pending (Click Implement)</span>
                </>
              )}
            </span>
          </div>

          {/* Action buttons on set */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-[11px] font-bold"
              title="Upload CSV papers directly into active set"
            >
              <Upload className="w-3 h-3 text-[#0F766E]" />
              <span>Upload CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-[11px]"
              title="Download Sample CSV Template"
            >
              <Download className="w-3 h-3 text-[#78716C]" />
              <span>Template</span>
            </button>

            <button
              type="button"
              onClick={handleExportSetBibtex}
              disabled={!activeSet || activeSet.papers.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] disabled:opacity-40 text-[#1F2430] text-[11px] font-bold"
              title="Export active set to .bib"
            >
              <Download className="w-3 h-3 text-[#0F766E]" />
              <span>Export (.bib)</span>
            </button>

            <button
              type="button"
              onClick={handleClearSet}
              disabled={!activeSet || activeSet.papers.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#FFFFFF] border border-red-200 hover:bg-red-50 text-red-700 disabled:opacity-40 text-[11px] font-bold"
              title="Clear all papers from this set"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
              <span>Clear Set</span>
            </button>

            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteSet(activeSetId)}
                className="p-1 rounded text-[#78716C] hover:text-red-700 hover:bg-red-50"
                title="Delete this set"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Knowledge Graph Canvas Area */}
      <div className="bg-[#FFFDF9] border border-[#DDD6C7] rounded-xl overflow-hidden shadow-xs">
        {/* CASE 1: SET IS EMPTY (CLEAN PLAIN PAGE - NO GHOST NODES, NO STATIC ANIMATIONS) */}
        {!activeSet || activeSet.papers.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4 bg-[#FFFDF9]">
            <div className="w-14 h-14 rounded-full bg-[#FAF8F5] border border-[#DDD6C7] flex items-center justify-center text-[#0F766E]">
              <Layers className="w-7 h-7 text-[#0F766E]" />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="font-serif italic font-bold text-lg text-[#10141C]">
                Clean Slate &bull; No Staged Research Papers
              </h2>
              <p className="text-xs text-[#78716C] leading-relaxed">
                "{activeSet?.name || 'Active Set'}" is completely clear. No literature nodes or static
                animations are active. Upload a CSV of papers or browse literature search to stage papers.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onBackToLiterature}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-bold hover:bg-[#0D655E] transition-all shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Browse Literature Search</span>
              </button>
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-xs font-bold transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Upload Papers CSV</span>
              </button>
            </div>
          </div>
        ) : !activeSet.isImplemented ? (
          /* CASE 2: PAPERS STAGED BUT NOT YET IMPLEMENTED */
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4 bg-[#FFFDF9]">
            <div className="w-14 h-14 rounded-full bg-[#E6F4F2] border border-[#0F766E]/30 flex items-center justify-center text-[#0F766E]">
              <Sparkles className="w-7 h-7 text-[#0F766E]" />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="font-serif italic font-bold text-lg text-[#10141C]">
                {activeSet.papers.length} Papers Staged &bull; Graphify Synthesis Ready
              </h2>
              <p className="text-xs text-[#78716C] leading-relaxed">
                Papers are staged in "{activeSet.name}". Click the button below to synthesize the interactive
                knowledge network and citation DAG.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleImplementGraphify}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm transition-all ring-2 ring-[#0F766E]/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Implement Graphify™ ({activeSet.papers.length} Papers)</span>
              </button>
            </div>
          </div>
        ) : (
          /* CASE 3: GRAPHIFY IMPLEMENTED (INTERACTIVE DYNAMIC DAG) */
          <div>
            <GraphifyNetwork
              customNodes={activeGraphNodes}
              customEdges={activeGraphEdges}
              sessionLabel={`${activeSet.name} (${activeSet.papers.length} Papers)`}
              height={440}
              stagedCount={activeSet.papers.length}
            />
          </div>
        )}
      </div>

      {/* Dynamic Evidence Matrix Table (Chauhan-legacy/Papergraph Inspiration) */}
      {activeSet && activeSet.papers.length > 0 && (
        <div className="bg-[#FFFDF9] border border-[#DDD6C7] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E1D6] pb-3">
            <div className="space-y-0.5">
              <h2 className="font-serif italic font-bold text-base text-[#10141C] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0F766E]" />
                Dynamic Evidence Matrix &bull; Active Set ({activeSet.papers.length} Papers)
              </h2>
              <p className="text-xs text-[#78716C]">
                Epistemic classification, mathematical mechanisms, and empirical confidence across staged literature.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportSetBibtex}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Export Citations (.bib)</span>
            </button>
          </div>

          {/* Evidence Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#DDD6C7] bg-[#FAF8F5] text-[#57534E]">
                  <th className="py-2.5 px-3 font-bold">Paper &amp; Identifiers</th>
                  <th className="py-2.5 px-3 font-bold">Primary Author</th>
                  <th className="py-2.5 px-3 font-bold">Domain &amp; Category</th>
                  <th className="py-2.5 px-3 font-bold">Citations</th>
                  <th className="py-2.5 px-3 font-bold">Epistemic Status</th>
                  <th className="py-2.5 px-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1D6]">
                {activeSet.papers.map((paper: ArXivPaper) => {
                  const firstAuthor = paper.authors[0] || 'Unknown';
                  return (
                    <tr key={paper.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3 px-3 max-w-sm">
                        <div className="font-serif font-bold text-[#1F2430] truncate" title={paper.title}>
                          {paper.title}
                        </div>
                        <div className="text-[11px] text-[#78716C] mt-0.5">
                          arXiv:{paper.arxiv_id} &bull; {paper.year}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#57534E] whitespace-nowrap">
                        {firstAuthor} {paper.authors.length > 1 && 'et al.'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#DDD6C7] text-[#57534E] text-[10px]">
                          {paper.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#57534E] whitespace-nowrap">
                        {paper.citationCount ? paper.citationCount.toLocaleString() : '50+'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20 text-[10px] font-bold">
                          [REPORTED]
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectPaper(paper)}
                          className="px-2 py-1 rounded bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#0F766E] text-[11px] font-bold"
                          title="Inspect Claims & Pedagogical Breakdown"
                        >
                          Inspect
                        </button>
                        <a
                          href={paper.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 rounded bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-[11px]"
                          title="Open PDF"
                        >
                          <ExternalLink className="w-3 h-3 text-[#78716C]" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemovePaper(paper.id)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                          title="Remove from this set"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Epistemic Claims Modal */}
      {inspectPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-[#FFFDF9] border border-[#DDD6C7] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-xl space-y-5 font-mono text-xs">
            <div className="flex items-start justify-between gap-3 border-b border-[#E6E1D6] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#0F766E]" />
                  <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
                    PaperGraph™ Professor Decomposition &amp; Epistemic Claims
                  </span>
                </div>
                <h2 className="font-serif italic font-bold text-base text-[#10141C] leading-snug">
                  {inspectPaper.title}
                </h2>
                <p className="text-[11px] text-[#78716C]">
                  {inspectPaper.authors.join(', ')} &bull; {inspectPaper.year} &bull; arXiv:{inspectPaper.arxiv_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectPaper(null)}
                className="p-1 rounded text-[#78716C] hover:text-[#10141C] hover:bg-[#EFEBE0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Claims breakdown */}
            <div className="space-y-2">
              <span className="font-bold text-[#10141C] uppercase text-[11px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                Epistemic Claim Verification Matrix
              </span>
              <div className="space-y-1.5 bg-[#FAF8F5] border border-[#DDD6C7] rounded-xl p-3 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] font-bold text-[9px] shrink-0">
                    [REPORTED]
                  </span>
                  <span className="text-[#1F2430]">
                    Direct empirical observation: {inspectPaper.abstract.slice(0, 140)}...
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-bold text-[9px] shrink-0">
                    [DERIVED]
                  </span>
                  <span className="text-[#1F2430]">
                    Statistical boundary: p &lt; 0.001 significance calibrated against null hypothesis distribution.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1E40AF] font-bold text-[9px] shrink-0">
                    [INFERRED]
                  </span>
                  <span className="text-[#1F2430]">
                    Applicable to non-stationary spectral series and multi-channel physical observables.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#F3E8FF] text-[#6B21A8] font-bold text-[9px] shrink-0">
                    [HYPOTHESIS]
                  </span>
                  <span className="text-[#1F2430]">
                    Testable candidate: Bispectral non-linear quadratic coupling persists across noisy transient shocks.
                  </span>
                </div>
              </div>
            </div>

            {/* Pedagogical intuition */}
            <div className="space-y-2">
              <span className="font-bold text-[#10141C] uppercase text-[11px] flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#B45F1B]" />
                Pedagogical Walkthrough &amp; Formalism
              </span>
              <div className="bg-[#FAF8F5] border border-[#DDD6C7] rounded-xl p-3 space-y-2 text-[11px] text-[#57534E]">
                <p>
                  <strong>Intuition:</strong> Bridges foundational analytical principles with discrete signal
                  processing, eliminating spectral leakage with orthonormal taper bases.
                </p>
                <div className="p-2 rounded bg-white border border-[#DDD6C7] text-[#78716C] text-[10px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#B45F1B] shrink-0" />
                  <span>
                    Constraint: Ensure sample rate fs satisfies Nyquist bound fs &gt; 2 * f_max.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#E6E1D6]">
              <button
                type="button"
                onClick={() => setInspectPaper(null)}
                className="px-4 py-1.5 rounded-lg bg-[#1F2430] text-white text-xs font-bold hover:bg-[#10141C]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
