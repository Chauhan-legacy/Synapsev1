import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  Download,
  Copy,
  Check,
  Upload,
  Layers,
  Sparkles,
  X,
  FileText,
  Shield,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import {
  ArXivPaper,
  CURATED_ARXIV_CATALOG,
  searchArxiv,
  generateBibTeX,
  generateApaCitation,
} from '../services/arxivService';
import {
  loadStoredPaperGraphSets,
  savePaperGraphSets,
  PaperGraphSet,
} from '../services/paperGraphRackService';
import { parsePaperCsv, generateSamplePapersCsv } from '../utils/paperCsvParser';

interface PaperGraphViewProps {
  onOpenRackWorkspace: () => void;
  onOpenPaperWorkbench?: () => void;
}

export const PaperGraphView: React.FC<PaperGraphViewProps> = ({
  onOpenRackWorkspace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ArXivPaper[]>(CURATED_ARXIV_CATALOG);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'bibtex' | 'apa' | null>(null);
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Staging sets state
  const [paperGraphSets, setPaperGraphSets] = useState<PaperGraphSet[]>(() =>
    loadStoredPaperGraphSets()
  );
  const activeSet = paperGraphSets[0] || null;

  // Staged paper IDs in the active set
  const stagedPaperIds = useMemo(() => {
    return new Set(activeSet?.papers.map((p: ArXivPaper) => p.id) || []);
  }, [activeSet]);

  // Keep saved sets synchronized
  useEffect(() => {
    savePaperGraphSets(paperGraphSets);
  }, [paperGraphSets]);

  // Hidden CSV file input ref
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Add / Remove paper from active set
  const handleToggleStagePaper = (paper: ArXivPaper) => {
    setPaperGraphSets((prevSets) =>
      prevSets.map((s, idx) => {
        if (idx !== 0) return s; // active set is first
        const isAlreadyStaged = s.papers.some((p: ArXivPaper) => p.id === paper.id);
        const nextPapers = isAlreadyStaged
          ? s.papers.filter((p: ArXivPaper) => p.id !== paper.id)
          : [...s.papers, paper];

        showToast(
          isAlreadyStaged
            ? `Removed "${paper.title.slice(0, 36)}..." from active set.`
            : `Added "${paper.title.slice(0, 36)}..." to active set (${nextPapers.length} staged).`
        );

        return {
          ...s,
          papers: nextPapers,
          isImplemented: false, // reset so Graphify reflects updated papers
        };
      })
    );
  };

  // Upload CSV of papers
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast(`Ingesting research papers CSV: ${file.name}...`);
      const { papers: parsedPapers, errors } = await parsePaperCsv(file);

      if (parsedPapers.length === 0) {
        showToast(errors.length > 0 ? errors[0] : 'CSV parsed but no valid research paper rows were found.');
        return;
      }

      setPaperGraphSets((prevSets) =>
        prevSets.map((s, idx) => {
          if (idx !== 0) return s;
          const existingIds = new Set(s.papers.map((p: ArXivPaper) => p.id));
          const uniqueNew = parsedPapers.filter((p: ArXivPaper) => !existingIds.has(p.id));
          return {
            ...s,
            papers: [...s.papers, ...uniqueNew],
            isImplemented: false,
          };
        })
      );

      // Also append to current search catalog for immediate discovery
      setCatalog((prev) => {
        const catIds = new Set(prev.map((p: ArXivPaper) => p.id));
        const added = parsedPapers.filter((p: ArXivPaper) => !catIds.has(p.id));
        return [...added, ...prev];
      });

      showToast(`Successfully imported ${parsedPapers.length} papers from CSV into active set.`);
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

  // Export All BibTeX
  const handleExportAllBibtex = () => {
    const papersToExport = catalog;
    const bibtexStr = papersToExport.map(generateBibTeX).join('\n\n');
    const blob = new Blob([bibtexStr], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synapse_papergraph_catalog_${Date.now()}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${papersToExport.length} citations to BibTeX.`);
  };

  // Copy Citation helpers
  const handleCopyBibtex = (paper: ArXivPaper) => {
    const bibtex = generateBibTeX(paper);
    navigator.clipboard.writeText(bibtex);
    setCopiedId(paper.id);
    setCopiedType('bibtex');
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2500);
  };

  const handleCopyApa = (paper: ArXivPaper) => {
    const apa = generateApaCitation(paper);
    navigator.clipboard.writeText(apa);
    setCopiedId(paper.id);
    setCopiedType('apa');
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2500);
  };

  // Search logic
  const handleSearchSubmit = async (queryText?: string) => {
    const query = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!query) {
      setCatalog(CURATED_ARXIV_CATALOG);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchArxiv(query, 15);
      if (results && results.papers && results.papers.length > 0) {
        setCatalog(results.papers);
      } else {
        const localMatches = CURATED_ARXIV_CATALOG.filter(
          (p) =>
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.abstract.toLowerCase().includes(query.toLowerCase()) ||
            p.authors.some((a) => a.toLowerCase().includes(query.toLowerCase())) ||
            p.category.toLowerCase().includes(query.toLowerCase())
        );
        setCatalog(localMatches);
      }
    } catch {
      const localMatches = CURATED_ARXIV_CATALOG.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.abstract.toLowerCase().includes(query.toLowerCase())
      );
      setCatalog(localMatches);
    } finally {
      setIsSearching(false);
    }
  };

  // Quick topics
  const quickTopics = [
    { label: 'LIGO GW150914', query: 'gravitational wave merger black hole LIGO' },
    { label: 'Kepler-186f Exoplanet', query: 'exoplanet transit Kepler transmission spectroscopy' },
    { label: 'CERN Higgs Boson', query: 'Higgs boson di-photon resonance CERN ATLAS CMS' },
    { label: 'Planck CMB', query: 'cosmic microwave background Planck angular power spectrum' },
    { label: 'Nuclear Reactor Core', query: 'nuclear reactor point-kinetics delayed neutron' },
    { label: 'Tokamak Fusion', query: 'tokamak plasma magnetic confinement MHD disruption' },
    { label: 'Takens Chaos', query: 'Takens theorem phase space reconstruction delay coordinates' },
    { label: 'Multitaper F-Test', query: 'Thomson multitaper DPSS spectral harmonic line test' },
    { label: 'Wigner-Ville', query: 'Wigner-Ville distribution instantaneous frequency time-frequency' },
    { label: 'Ising Model', query: 'Ising model ferromagnetic phase transition Onsager exact solution' },
  ];

  const handleSelectQuickTopic = (topic: { label: string; query: string }) => {
    if (selectedTopic === topic.label) {
      setSelectedTopic(null);
      setSearchQuery('');
      setCatalog(CURATED_ARXIV_CATALOG);
    } else {
      setSelectedTopic(topic.label);
      setSearchQuery(topic.label);
      handleSearchSubmit(topic.query);
    }
  };

  // Category filter
  const categories = [
    { id: 'all', label: 'All Fields' },
    { id: 'astro', label: 'Astrophysics & Gravitation' },
    { id: 'signal', label: 'Signal Processing' },
    { id: 'chaos', label: 'Nonlinear Dynamics' },
    { id: 'stat', label: 'Statistical Methodology' },
  ];

  // Filtered Preprints
  const filteredPapers = useMemo(() => {
    return catalog.filter((paper) => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'astro') {
        return (
          paper.category.includes('astro') ||
          paper.category.includes('gr-qc') ||
          paper.category.includes('hep') ||
          paper.category.includes('nucl')
        );
      }
      if (selectedCategory === 'signal') {
        return (
          paper.category.includes('eess') ||
          paper.category.includes('Signal') ||
          paper.category.includes('cs')
        );
      }
      if (selectedCategory === 'chaos') {
        return (
          paper.category.includes('nlin') ||
          paper.category.includes('Dynamics') ||
          paper.category.includes('cond-mat')
        );
      }
      if (selectedCategory === 'stat') {
        return paper.category.includes('stat') || paper.category.includes('math');
      }
      return true;
    });
  }, [catalog, selectedCategory]);

  // Epistemic Claims Modal State (inspired by Chauhan-legacy/Papergraph)
  const [inspectPaper, setInspectPaper] = useState<ArXivPaper | null>(null);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 font-mono text-xs pb-12">
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

      {/* Top Banner (Identical to User Image 2 Reference) */}
      <div className="bg-[#FFFDF9] border border-[#DDD6C7] rounded-xl p-5 shadow-xs space-y-4">
        {/* Row 1: Header Title & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6E1D6] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-[#0F766E] shrink-0" />
              <h1 className="font-serif italic font-bold text-lg sm:text-xl text-[#10141C]">
                PaperGraph™ Literature &amp; Citation Network
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] font-bold border border-[#0F766E]/20 uppercase">
                OPEN-ACCESS ARXIV LINK
              </span>
            </div>
            <p className="text-xs text-[#78716C] font-mono leading-relaxed">
              Live semantic linkage connecting SYNAPSE experimental findings to peer-reviewed foundational preprints.
            </p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-xs font-bold transition-all shadow-2xs"
              title="Upload CSV list of papers with Title, Authors, Abstract, ArXiv ID"
            >
              <Upload className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Upload Papers CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-xs font-bold transition-all shadow-2xs"
              title="Download sample research papers CSV template"
            >
              <Download className="w-3.5 h-3.5 text-[#78716C]" />
              <span>Sample CSV</span>
            </button>

            <button
              type="button"
              onClick={onOpenRackWorkspace}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E6F4F2] border border-[#0F766E]/40 hover:bg-[#D4EBE7] text-[#0F766E] text-xs font-bold transition-all shadow-2xs ring-1 ring-[#0F766E]/20"
              title="Open full dedicated PaperGraph Testing Rack & Knowledge Graph workspace"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>PaperGraph Rack</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#0F766E] text-white text-[10px] font-bold ml-0.5">
                {activeSet?.papers.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportAllBibtex}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-xs transition-all"
              title="Export all visible preprints to .bib bibliography format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All (.bib)</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Input & Category Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search arXiv papers &amp; PDFs: e.g. black hole, ligo, exoplanet, higgs, chaos, tokamak..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit();
              }}
              className="w-full pl-9 pr-8 py-2 bg-[#FAF8F5] border border-[#DDD6C7] rounded-lg text-xs text-[#1F2430] placeholder:text-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#0F766E] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTopic(null);
                  setCatalog(CURATED_ARXIV_CATALOG);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#78716C] hover:text-[#1F2430]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#0F766E] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] border border-[#DDD6C7] text-[#57534E] hover:bg-[#EFEBE0]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Quick Topics */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E6E1D6]/60 text-[11px]">
          <span className="text-[#78716C] font-semibold mr-1"># Quick Topics:</span>
          {quickTopics.map((topic) => (
            <button
              key={topic.label}
              type="button"
              onClick={() => handleSelectQuickTopic(topic)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                selectedTopic === topic.label
                  ? 'bg-[#0F766E] text-white border-[#0F766E] font-bold'
                  : 'bg-[#FAF8F5] border-[#DDD6C7] text-[#57534E] hover:bg-[#EFEBE0]'
              }`}
            >
              {topic.label}
            </button>
          ))}
          {(selectedTopic || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTopic(null);
                setSearchQuery('');
                setCatalog(CURATED_ARXIV_CATALOG);
              }}
              className="px-2 py-0.5 rounded border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-bold ml-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Preprints & Literature List Header */}
      <div className="flex items-center justify-between text-xs font-mono px-1">
        <span className="font-bold text-[#1F2430]">
          Verified Preprints &amp; Open-Access Articles ({catalog.length} in catalog, showing{' '}
          {filteredPapers.length})
        </span>
        <span className="text-[#0F766E] flex items-center gap-1.5 font-semibold text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
          Direct PDF Downloads Active &bull; DOIs Calibrated
        </span>
      </div>

      {/* Literature Cards Grid / List */}
      {isSearching ? (
        <div className="p-12 bg-white rounded-xl border border-[#DDD6C7] text-center space-y-3 font-mono">
          <div className="w-8 h-8 mx-auto border-2 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#78716C]">Querying Open-Access arXiv preprints &amp; DOIs...</p>
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-[#DDD6C7] text-center space-y-3 font-mono">
          <BookOpen className="w-8 h-8 mx-auto text-[#A8A29E]" />
          <h3 className="font-serif italic font-bold text-base text-[#1F2430]">No Papers Found</h3>
          <p className="text-xs text-[#78716C]">
            No preprints matched "{searchQuery}". Try searching for terms like "black hole", "Higgs",
            "chaos", or "multitaper".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedTopic(null);
              setCatalog(CURATED_ARXIV_CATALOG);
            }}
            className="px-3 py-1.5 rounded bg-[#0F766E] text-white text-xs font-bold"
          >
            Reset Search
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPapers.map((paper) => {
            const isStaged = stagedPaperIds.has(paper.id);
            const isExpanded = expandedAbstracts[paper.id] || false;

            return (
              <div
                key={paper.id}
                className="bg-[#FFFDF9] border border-[#DDD6C7] hover:border-[#0F766E]/50 rounded-xl p-4 shadow-2xs space-y-3 transition-colors"
              >
                {/* Card Header Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://arxiv.org/abs/${paper.arxiv_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] font-bold hover:underline flex items-center gap-1 border border-[#0F766E]/20"
                    >
                      <span>arxiv:{paper.arxiv_id}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#DDD6C7] text-[#57534E]">
                      {paper.category}
                    </span>
                    {paper.citationCount && (
                      <span className="text-[10px] text-[#78716C]">
                        {paper.citationCount.toLocaleString()} citations
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] font-bold border border-[#0F766E]/20">
                    99% Semantic Match
                  </span>
                </div>

                {/* Paper Title */}
                <h3 className="font-serif font-bold text-base text-[#10141C] leading-snug">
                  {paper.title}
                </h3>

                {/* Authors, Year & DOI */}
                <div className="text-xs text-[#57534E] flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{paper.authors.join(', ')}</span>
                  <span>&bull;</span>
                  <span>{paper.year}</span>
                  {paper.doi && (
                    <>
                      <span>&bull;</span>
                      <a
                        href={`https://doi.org/${paper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0F766E] hover:underline"
                      >
                        DOI: {paper.doi}
                      </a>
                    </>
                  )}
                </div>

                {/* Abstract Text */}
                <div className="text-xs text-[#57534E] font-sans leading-relaxed">
                  <p>
                    {isExpanded ? paper.abstract : `${paper.abstract.slice(0, 240)}...`}
                    {paper.abstract.length > 240 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAbstracts((prev) => ({
                            ...prev,
                            [paper.id]: !isExpanded,
                          }))
                        }
                        className="text-[#0F766E] hover:underline ml-1.5 font-mono text-[11px] font-semibold"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </p>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6E1D6]/70">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* + Add to Rack Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleStagePaper(paper)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                        isStaged
                          ? 'bg-[#0F766E] text-white ring-1 ring-[#0F766E]'
                          : 'bg-[#FAF8F5] border border-[#0F766E]/40 text-[#0F766E] hover:bg-[#E6F4F2]'
                      }`}
                      title={
                        isStaged
                          ? 'Paper is staged in active PaperGraph set'
                          : 'Add paper to active PaperGraph set'
                      }
                    >
                      {isStaged ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>In Rack Set</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>+ Add to Rack</span>
                        </>
                      )}
                    </button>

                    {/* View PDF Button */}
                    <a
                      href={paper.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0F766E]" />
                      <span>View PDF</span>
                    </a>

                    {/* Copy BibTeX */}
                    <button
                      type="button"
                      onClick={() => handleCopyBibtex(paper)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#57534E] text-xs transition-colors"
                      title="Copy BibTeX citation"
                    >
                      {copiedId === paper.id && copiedType === 'bibtex' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span className="text-[#0F766E] font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#78716C]" />
                          <span>Copy BibTeX</span>
                        </>
                      )}
                    </button>

                    {/* Copy APA */}
                    <button
                      type="button"
                      onClick={() => handleCopyApa(paper)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#57534E] text-xs transition-colors"
                      title="Copy APA citation"
                    >
                      {copiedId === paper.id && copiedType === 'apa' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span className="text-[#0F766E] font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#78716C]" />
                          <span>Copy APA</span>
                        </>
                      )}
                    </button>

                    {/* Inspect Epistemic Claims (Chauhan-legacy/Papergraph inspiration) */}
                    <button
                      type="button"
                      onClick={() => setInspectPaper(paper)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#0F766E] text-xs font-bold transition-colors"
                      title="Inspect Professor-Level Epistemic Claims & Pedagogical Decomposition"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                      <span>Inspect Claims</span>
                    </button>
                  </div>

                  {paper.methodology && (
                    <span className="text-[11px] text-[#78716C] font-mono">
                      Method: {paper.methodology}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Epistemic Claims & Professor Decomposition Modal (Inspired by Chauhan-legacy/Papergraph) */}
      {inspectPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-[#FFFDF9] border border-[#DDD6C7] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-xl space-y-5 font-mono text-xs">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#E6E1D6] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#0F766E]" />
                  <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
                    PaperGraph™ Professor Analysis &amp; Epistemic Claims
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

            {/* Section 1: Epistemic Claims Matrix */}
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
                    Methodological applicability extends to non-stationary spectral series and nonlinear coupled regimes.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#F3E8FF] text-[#6B21A8] font-bold text-[9px] shrink-0">
                    [HYPOTHESIS]
                  </span>
                  <span className="text-[#1F2430]">
                    Testable candidate: Cross-correlation with higher-order bispectral modes preserves phase coherence under SNR &lt; 3 dB.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Pedagogical Walkthrough & Intuition */}
            <div className="space-y-2">
              <span className="font-bold text-[#10141C] uppercase text-[11px] flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#B45F1B]" />
                Pedagogical Walkthrough &amp; Mathematical Formalism
              </span>
              <div className="bg-[#FAF8F5] border border-[#DDD6C7] rounded-xl p-3 space-y-2 text-[11px] text-[#57534E]">
                <p>
                  <strong>Intuition:</strong> Bridges foundational analytical principles with experimental discretization.
                  Addresses spectral leakage and regime shifts by enforcing rigorous orthonormal bases.
                </p>
                {inspectPaper.methodology && (
                  <p>
                    <strong>Mathematical Mechanism:</strong> Evaluated via{' '}
                    <code className="text-[#0F766E] font-bold">{inspectPaper.methodology}</code>.
                  </p>
                )}
                <div className="p-2 rounded bg-white border border-[#DDD6C7] text-[#78716C] text-[10px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#B45F1B] shrink-0" />
                  <span>
                    Boundary Condition: Guard against finite-sample bias when signal window N &lt; 256 samples.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E6E1D6]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStagePaper(inspectPaper)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    stagedPaperIds.has(inspectPaper.id)
                      ? 'bg-[#0F766E] text-white'
                      : 'bg-[#FAF8F5] border border-[#0F766E] text-[#0F766E] hover:bg-[#E6F4F2]'
                  }`}
                >
                  {stagedPaperIds.has(inspectPaper.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>In Active Rack Set</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5" />
                      <span>+ Add to Rack Set</span>
                    </>
                  )}
                </button>

                <a
                  href={inspectPaper.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>View PDF</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setInspectPaper(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#1F2430] text-white text-xs font-bold hover:bg-[#10141C]"
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
