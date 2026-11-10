import React, { useState, useMemo } from 'react';
import { METHODS_CATALOG } from '../data/methodsCatalog';
import { MathFormula } from '../components/common/MathFormula';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { Search, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface MethodsLibraryViewProps {
  initialMethod?: string | null;
}

export const MethodsLibraryView: React.FC<MethodsLibraryViewProps> = ({ initialMethod }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(initialMethod || null);

  const categories = ['All', 'Spectral', 'Statistics', 'Anomaly', 'Structure', 'Relations', 'Inference'];

  const filteredCards = useMemo(() => {
    return METHODS_CATALOG.filter((c) => {
      const matchCat = selectedCategory === 'All' || c.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchQuery =
        searchQuery.trim() === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.plain_language.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-base font-bold text-primary">Algorithmic Methods Library &amp; Scientific Cards</h1>
          <p className="text-xs text-secondary mt-0.5">
            Mathematical definitions, KaTeX formulas, core assumptions, failure modes, and benchmark proofs
          </p>
        </div>
      </div>

      <CollapsibleExplainer title="What is the SYNAPSE Methods Library?">
        SYNAPSE adheres to the principle that no algorithm should be an opaque black box. Every method in the system
        carries a formal Method Card detailing its exact mathematical definition, operating assumptions, known vulnerabilities,
        failure modes, benchmark calibration references, and foundational literature citations.
      </CollapsibleExplainer>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#2563eb] text-white'
                  : 'surface-subtle border text-secondary hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search method or formula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-base border rounded-md text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="space-y-4">
        {filteredCards.length === 0 ? (
          <div className="surface-base border rounded-md p-8 text-center text-muted text-xs">
            No methods match your filter criteria.
          </div>
        ) : (
          filteredCards.map((card) => {
            const isExpanded = expandedCardId === card.id || expandedCardId === card.name;
            return (
              <div
                key={card.id}
                id={`method_${card.id}`}
                className="surface-base border rounded-md p-5 space-y-4 transition-all hover:border-[#2563eb]/50"
              >
                {/* Card Title & Meta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20">
                        {card.category}
                      </span>
                      <h2 className="text-sm font-bold text-primary font-sans">{card.name}</h2>
                    </div>
                    <p className="text-xs text-secondary font-sans leading-relaxed">{card.plain_language}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                    className="text-xs font-mono text-[#2563eb] hover:underline shrink-0"
                  >
                    {isExpanded ? 'Collapse [-]' : 'Expand Details [+]'}
                  </button>
                </div>

                {/* KaTeX Formula Box */}
                <div className="p-3.5 rounded bg-[#0d0e11] border border-[#26282e] overflow-x-auto text-center">
                  <MathFormula formula={card.latex_formula} displayMode={true} />
                </div>

                {/* Expanded Details: Assumptions, Failure Modes, Parameters, Benchmarks */}
                {isExpanded && (
                  <div className="space-y-4 pt-2 border-t font-mono text-xs">
                    {/* Assumptions & Failures */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-surface-subtle border space-y-2">
                        <div className="flex items-center gap-1.5 text-status-success font-bold text-[11px] uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Core Assumptions &amp; Preconditions</span>
                        </div>
                        <ul className="space-y-1 font-sans text-xs text-secondary">
                          {card.assumptions.map((a, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-muted">•</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 rounded bg-surface-subtle border space-y-2">
                        <div className="flex items-center gap-1.5 text-status-danger font-bold text-[11px] uppercase">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Known Failure Modes &amp; Limitations</span>
                        </div>
                        <ul className="space-y-1 font-sans text-xs text-secondary">
                          {card.failure_modes.map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-muted">•</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Parameters Table */}
                    {card.parameters.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-muted">Configurable Parameters</div>
                        <div className="border rounded overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="surface-subtle border-b text-secondary">
                              <tr>
                                <th className="py-1.5 px-3 text-left">Parameter</th>
                                <th className="py-1.5 px-3 text-left">Type</th>
                                <th className="py-1.5 px-3 text-left">Default</th>
                                <th className="py-1.5 px-3 text-left">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-sans">
                              {card.parameters.map((p) => (
                                <tr key={p.name} className="hover:bg-surface-subtle/40">
                                  <td className="py-2 px-3 font-mono font-bold text-primary">{p.name}</td>
                                  <td className="py-2 px-3 font-mono text-muted">{p.type}</td>
                                  <td className="py-2 px-3 font-mono text-primary">{p.default_val}</td>
                                  <td className="py-2 px-3 text-secondary">{p.desc}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Benchmark Proof */}
                    <div className="p-3 rounded bg-surface-subtle border space-y-1 font-sans text-xs">
                      <span className="font-bold text-primary font-mono text-[10px] uppercase">
                        Validation Benchmark Example:
                      </span>
                      <p className="text-secondary">{card.benchmark_example}</p>
                    </div>

                    {/* Academic Citations */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-muted">Literature Citations</div>
                      <div className="space-y-0.5 text-[11px] text-muted font-sans italic">
                        {card.references.map((r, i) => (
                          <div key={i}>[{i + 1}] {r}</div>
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
