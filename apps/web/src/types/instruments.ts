/**
 * SYNAPSE Instrument Rack & Analyser Types
 */

export type InstrumentCategory =
  | 'time_freq'
  | 'spectral'
  | 'complexity'
  | 'anomaly'
  | 'relations'
  | 'modeling'
  | 'rigor'
  | 'astronomy';

export type InstrumentStatus = 'running' | 'done' | 'warning' | 'error';

export interface InstrumentLegendItem {
  name: string;
  color: string;
  unit?: string;
  dashed?: boolean;
}

export interface InstrumentFinding {
  title: string;
  metric: string;
  p_value?: number;
  confidence?: string;
  interpretation: string;
}

export interface InstrumentDefinition {
  id: string;
  title: string;
  category: InstrumentCategory;
  caption: string;
  tier: 1 | 2;
  legend: InstrumentLegendItem[];
  defaultHeight?: number;
  defaultColSpan?: 1 | 2 | 3;
}

export interface PanelState {
  id: string;
  visible: boolean;
  collapsed: boolean;
  pinned: boolean;
  colSpan: 1 | 2 | 3;
  customSettings?: Record<string, any>;
}

