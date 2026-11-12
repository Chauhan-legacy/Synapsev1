export interface SignalQuality {
  total_samples: number;
  channel_count: number;
  sampling_rate: number;
  is_uniform: boolean;
  timestamp_jitter_pct: number;
  nan_count: number;
  infinite_count: number;
  clipping_count: number;
  content_hash_sha256: string;
  original_sha256?: string;
  timestamps_linearized?: boolean;
  linearization_notice?: string;
  warnings: string[];
}

export interface SignalData {
  id: string;
  filename: string;
  samplingRate: number;
  timestamps: number[];
  channels: Record<string, number[]>; // channel_name -> values
  channelNames: string[];
  duration: number;
  quality: SignalQuality;
  timestampsLinearized?: boolean;
  linearizationNotice?: string;
  originalSha256?: string;
}

