import React, { useState } from 'react';
import {
  Compass,
  Database,
  LineChart,
  BarChart2,
  Activity,
  AlertOctagon,
  GitBranch,
  Network,
  ShieldCheck,
  Award,
  Share2,
  FileText,
  Sliders,
  BookOpen,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';

export type WorkbenchView =
  | 'overview'
  | 'datasets'
  | 'explorer'
  | 'statistics'
  | 'spectra'
  | 'timefreq'
  | 'anomalies'
  | 'dynamics'
  | 'relations'
  | 'inference'
  | 'findings'
  | 'evidence'
  | 'reproducibility'
  | 'benchmarks'
  | 'methods';

export type ModuleStatus = 'not_run' | 'running' | 'done' | 'needs_attention';

interface NavItem {
  id: WorkbenchView;
  label: string;
  icon: React.ElementType;
  status?: ModuleStatus;
  statusTooltip?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  currentView: WorkbenchView;
  onSelectView: (view: WorkbenchView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAccessibility: () => void;
  onOpenShortcuts: () => void;
  moduleStatuses: Record<string, ModuleStatus>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenAccessibility,
  onOpenShortcuts,
  moduleStatuses,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const navGroups: NavGroup[] = [
    {
      title: 'Start',
      items: [
        { id: 'overview', label: 'Overview', icon: Compass },
        { id: 'datasets', label: 'Datasets', icon: Database },
      ],
    },
    {
      title: 'Explore',
      items: [
        { id: 'explorer', label: 'Signal Explorer', icon: LineChart },
        { id: 'statistics', label: 'Statistics Lab', icon: BarChart2 },
      ],
    },
    {
      title: 'Analyse',
      items: [
        { id: 'spectra', label: 'Spectral Lab', icon: Activity },
        { id: 'timefreq', label: 'Time-Frequency Lab', icon: Sliders },
        { id: 'anomalies', label: 'Anomalies & Events', icon: AlertOctagon },
        { id: 'dynamics', label: 'Dynamics & Structure', icon: GitBranch },
        { id: 'relations', label: 'Relations Lab', icon: Network },
      ],
    },
    {
      title: 'Verify',
      items: [
        { id: 'inference', label: 'Inference & Nulls', icon: ShieldCheck },
        { id: 'findings', label: 'Findings', icon: Award },
        { id: 'evidence', label: 'Evidence Graph', icon: Share2 },
        { id: 'reproducibility', label: 'Reproducibility', icon: FileText },
      ],
    },
    {
      title: 'Reference',
      items: [
        { id: 'benchmarks', label: 'Benchmarks', icon: Award },
        { id: 'methods', label: 'Methods Library', icon: BookOpen },
      ],
    },
  ];

  const renderStatusDot = (viewId: string) => {
    const status = moduleStatuses[viewId] || 'not_run';
    switch (status) {
      case 'done':
        return (
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"
            title="Module executed: done"
            aria-label="Status: done"
          />
        );
      case 'running':
        return (
          <span
            className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block shrink-0"
            title="Module computation: running"
            aria-label="Status: running"
          />
        );
      case 'needs_attention':
        return (
          <span
            className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0"
            title="Module: needs attention"
            aria-label="Status: needs attention"
          />
        );
      case 'not_run':
      default:
        return (
          <span
            className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 inline-block shrink-0"
            title="Module status: Not run"
            aria-label="Status: not run"
          />
        );
    }
  };

  const content = (
    <div className="flex flex-col h-full surface-base border-r border-slate-200 dark:border-slate-800 select-none">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-13 px-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            S
          </div>
          {!collapsed && (
            <div className="truncate font-semibold tracking-wide text-xs text-primary font-mono uppercase">
              SYNAPSE <span className="text-[10px] text-muted font-sans font-normal lowercase">v2.0</span>
            </div>
          )}
        </div>
        <div className="flex items-center">
          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1 rounded text-muted hover:text-primary"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Desktop collapse rail button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 rounded text-muted hover:text-primary transition-colors"
            title={collapsed ? 'Expand sidebar (240px)' : 'Collapse to icon rail (64px)'}
            aria-label="Toggle sidebar width"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nav Groups Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-2 space-y-4 px-2">
        {navGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.title] && !collapsed;
          return (
            <div key={group.title} className="space-y-0.5">
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-muted uppercase tracking-wider hover:text-primary"
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              )}

              {!isGroupCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = currentView === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectView(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                        } ${collapsed ? 'justify-center px-1' : ''}`}
                        title={collapsed ? item.label : undefined}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                        {!collapsed && renderStatusDot(item.id)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pinned Bottom Actions */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <button
          type="button"
          onClick={onOpenAccessibility}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            collapsed ? 'justify-center px-1' : ''
          }`}
          title="Accessibility & Themes"
        >
          <Sliders className="w-4 h-4 shrink-0 text-blue-600" />
          {!collapsed && <span>Accessibility</span>}
        </button>

        <button
          type="button"
          onClick={onOpenShortcuts}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            collapsed ? 'justify-center px-1' : ''
          }`}
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <div className="flex items-center justify-between flex-1">
              <span>Shortcuts</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-200 dark:bg-slate-800 rounded">?</kbd>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 ease-in-out ${
          collapsed ? 'w-16' : 'w-60'
        }`}
        aria-label="Workbench Navigation"
      >
        {content}
      </aside>

      {/* Mobile Drawer (Below 1024px) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-xs h-full z-10 shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
