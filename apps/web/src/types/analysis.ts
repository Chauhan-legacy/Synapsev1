export type FindingStatus = 'supported' | 'inconclusive' | 'rejected' | 'not_run';

export interface MethodDiagnostic {
  name: string;
  value: number | string;
  passed: boolean;
}

export interface MethodAssumption {
  text: string;
  checked: boolean;
  passed: boolean;
}

export interface MethodUncertainty {
  ci_low: number;
  ci_high: number;
  level: number;
  method: string;
}

export interface StatisticalTest {
  statistic: number;
  p_raw: number;
  p_adjusted?: number;
  correction?: string;
  null_model: string;
  n_surrogates?: number;
}

export interface CommonResultSchema {
  method: string;
  version: string;
  parameters: Record<string, unknown>;
  estimate: number | Record<string, number>;
  uncertainty?: MethodUncertainty;
  test?: StatisticalTest;
  effect_size?: number;
  diagnostics: MethodDiagnostic[];
  assumptions: MethodAssumption[];
  status: FindingStatus;
  plain_language_summary: string;
  meaning: string;
  evidence_refs: string[];
  runtime_ms: number;
  seed?: number;
}

export interface MethodCard {
  id: string;
  name: string;
  category: 'Spectral' | 'Time-Frequency' | 'Statistics' | 'Anomalies' | 'Dynamics' | 'Relations' | 'Inference';
  plain_language: string;
  latex_formula: string;
  assumptions: string[];
  failure_modes: string[];
  parameters: Array<{ name: string; type: string; default_val: string; desc: string }>;
  benchmark_example: string;
  references: string[];
}

export interface BenchmarkDatasetInfo {
  id: string;
  code: string;
  name: string;
  category: string;
  n_samples: number;
  n_channels: number;
  sampling_rate: number;
  planted_features: Array<{
    name: string;
    type: string;
    ground_truth: string | number;
    recovered?: string | number;
    error_pct?: number;
    detected: boolean;
  }>;
}

