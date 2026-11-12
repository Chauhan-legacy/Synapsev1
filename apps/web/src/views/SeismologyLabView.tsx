import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  MapPin,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Radio,
  Layers,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EarthquakeFeature {
  id: string;
  mag: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depth_km: number;
}

interface FeedResponse {
  features: EarthquakeFeature[];
}

interface InversionResult {
  epicentral_distance_km: number;
  epicentral_distance_deg: number;
  P_arrival_s: number;
  S_arrival_s: number;
  sp_delay_s: number;
  energy_J: number;
  tnt_equivalent_kg: number;
  mechanism: string;
}

type FeedParam = 'all_hour' | 'all_day' | 'significant_month';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function magColor(mag: number): string {
  if (mag < 3) return 'bg-green-100 text-green-800 border-green-300';
  if (mag < 5) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-red-100 text-red-800 border-red-300';
}

function magDotColor(mag: number): string {
  if (mag < 3) return 'bg-green-500';
  if (mag < 5) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatLocalTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function toSci(val: number, digits = 3): string {
  if (val === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(val)));
  const mantissa = val / Math.pow(10, exp);
  return `${mantissa.toFixed(digits)} × 10^${exp}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MethodPanelProps {
  open: boolean;
  onToggle: () => void;
}

const MethodPanel: React.FC<MethodPanelProps> = ({ open, onToggle }) => (
  <div className="bg-white border border-[#DDD6C7] rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 font-mono text-sm font-semibold text-[#1F2430] hover:bg-[#F6F3EC] transition-colors"
    >
      <span className="flex items-center gap-2">
        <Layers size={16} className="text-[#0F766E]" />
        Method Panel — Physics &amp; Equations
      </span>
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>

    {open && (
      <div className="px-5 pb-5 space-y-5 font-mono text-xs text-[#1F2430] border-t border-[#DDD6C7]">
        {/* Vincenty */}
        <div className="pt-4">
          <p className="text-[#0F766E] font-semibold mb-2">1. Vincenty Geodesic Distance</p>
          <pre className="bg-[#F6F3EC] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`Δσ = atan2(
  √((cosφ₂·sinΔλ)² + (cosφ₁·sinφ₂ − sinφ₁·cosφ₂·cosΔλ)²),
  sinφ₁·sinφ₂ + cosφ₁·cosφ₂·cosΔλ
)
d_km = R_earth · Δσ    (R_earth = 6371 km)
d_deg = Δσ · (180/π)

Vincenty iterates for WGS-84 flattening (f = 1/298.257223563)
for sub-millimetre precision on the oblate spheroid.`}
          </pre>
        </div>

        {/* IASP91 */}
        <div>
          <p className="text-[#0F766E] font-semibold mb-2">2. IASP91 τ-p Travel Time (22-point table lookup)</p>
          <pre className="bg-[#F6F3EC] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`IASP91 reference Earth model defines slowness tables
for P and S phases at 22 distance nodes (0°–180°).

t(Δ) = τ(p*) + p* · Δ
where p* = ray parameter at turning depth,
      τ   = delay time integral.

Lookup: interpolate the 22-node table to get
  t_P(Δ_deg)  and  t_S(Δ_deg)
in seconds from origin time.`}
          </pre>
        </div>

        {/* S-P delay */}
        <div>
          <p className="text-[#0F766E] font-semibold mb-2">3. S-P Delay</p>
          <pre className="bg-[#F6F3EC] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`t_SP = t_S − t_P

Used for rapid distance estimation when origin time is unknown:
  d_km ≈ t_SP / (1/v_S − 1/v_P)
with v_P ≈ 6.0 km/s, v_S ≈ 3.5 km/s (crustal averages).`}
          </pre>
        </div>

        {/* Energy */}
        <div>
          <p className="text-[#0F766E] font-semibold mb-2">4. Radiated Energy &amp; TNT Equivalent</p>
          <pre className="bg-[#F6F3EC] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`log₁₀(E_J) = 4.8 + 1.5 · Mw
  → E in Joules  (Gutenberg-Richter, 1956)

TNT equivalent:
  1 kilotonne TNT = 4.184 × 10¹² J
  E_tnt_kg = E_J / (4.184 × 10⁹)   [1 tonne = 4.184×10⁹ J]`}
          </pre>
        </div>
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const SeismologyLabView: React.FC = () => {
  // Feed
  const [feedParam, setFeedParam] = useState<FeedParam>('all_hour');
  const [events, setEvents] = useState<EarthquakeFeature[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Station
  const [stationLat, setStationLat] = useState('51.4769');
  const [stationLon, setStationLon] = useState('-0.0005');

  // Selected event & inversion
  const [selectedEvent, setSelectedEvent] = useState<EarthquakeFeature | null>(null);
  const [inversion, setInversion] = useState<InversionResult | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  // Method panel
  const [methodOpen, setMethodOpen] = useState(true);

  // ── Fetch feed ──────────────────────────────────────────────────────────────
  const fetchFeed = useCallback(async (feed: FeedParam) => {
    setFeedLoading(true);
    setFeedError(null);
    setEvents([]);
    setSelectedEvent(null);
    setInversion(null);
    try {
      const res = await fetch(`/api/seismology/feed?feed=${feed}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FeedResponse = await res.json();
      setEvents(data.features ?? []);
    } catch (e: unknown) {
      setFeedError(e instanceof Error ? e.message : 'Failed to load feed');
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(feedParam);
  }, [feedParam, fetchFeed]);

  // ── Fetch inversion ─────────────────────────────────────────────────────────
  const handleEventClick = useCallback(
    async (evt: EarthquakeFeature) => {
      setSelectedEvent(evt);
      setInversion(null);
      setInvError(null);
      setInvLoading(true);
      try {
        const lat = parseFloat(stationLat) || 51.4769;
        const lon = parseFloat(stationLon) || -0.0005;
        const url = `/api/seismology/inversion?event_id=${encodeURIComponent(evt.id)}&station_lat=${lat}&station_lon=${lon}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InversionResult = await res.json();
        setInversion(data);
      } catch (e: unknown) {
        setInvError(e instanceof Error ? e.message : 'Inversion failed');
      } finally {
        setInvLoading(false);
      }
    },
    [stationLat, stationLon],
  );

  // ── Feed tabs config ────────────────────────────────────────────────────────
  const tabs: { label: string; value: FeedParam }[] = [
    { label: 'Past Hour', value: 'all_hour' },
    { label: 'Past Day', value: 'all_day' },
    { label: 'Significant', value: 'significant_month' },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F3EC] font-mono p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#0F766E] rounded-xl">
          <Activity size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1F2430] tracking-tight">Seismology Lab</h1>
          <p className="text-xs text-[#5C6570]">Real-time earthquake feed · USGS · IASP91 travel times</p>
        </div>
      </div>

      {/* Feed tabs + Station inputs */}
      <div className="bg-white border border-[#DDD6C7] rounded-xl p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setFeedParam(t.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                feedParam === t.value
                  ? 'bg-[#0F766E] text-white border-[#0F766E]'
                  : 'bg-[#F6F3EC] text-[#1F2430] border-[#DDD6C7] hover:border-[#0F766E] hover:text-[#0F766E]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Station coords */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-[#5C6570] font-semibold">
            <Radio size={13} className="text-[#0F766E]" />
            Station (lat, lon):
          </span>
          <input
            type="text"
            value={stationLat}
            onChange={(e) => setStationLat(e.target.value)}
            className="w-28 px-2.5 py-1.5 text-xs border border-[#DDD6C7] rounded-lg bg-[#F6F3EC] focus:outline-none focus:border-[#0F766E] text-[#1F2430]"
            placeholder="Latitude"
          />
          <input
            type="text"
            value={stationLon}
            onChange={(e) => setStationLon(e.target.value)}
            className="w-28 px-2.5 py-1.5 text-xs border border-[#DDD6C7] rounded-lg bg-[#F6F3EC] focus:outline-none focus:border-[#0F766E] text-[#1F2430]"
            placeholder="Longitude"
          />
          <span className="text-xs text-[#5C6570]">(default: Royal Observatory, Greenwich)</span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Earthquake list ── */}
        <div className="bg-white border border-[#DDD6C7] rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#DDD6C7] flex items-center justify-between">
            <span className="text-sm font-bold text-[#1F2430] flex items-center gap-2">
              <MapPin size={15} className="text-[#0F766E]" />
              Earthquake Events
            </span>
            {!feedLoading && (
              <span className="text-xs text-[#5C6570]">{events.length} events</span>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
            {feedLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#5C6570]">
                <Loader2 size={28} className="animate-spin text-[#0F766E]" />
                <span className="text-xs">Loading feed…</span>
              </div>
            )}
            {feedError && (
              <div className="flex items-center gap-2 m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                <AlertCircle size={14} />
                {feedError}
              </div>
            )}
            {!feedLoading && !feedError && events.length === 0 && (
              <div className="py-16 text-center text-xs text-[#5C6570]">No events found.</div>
            )}
            {!feedLoading &&
              events.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                return (
                  <button
                    key={evt.id}
                    onClick={() => handleEventClick(evt)}
                    className={`w-full text-left px-5 py-3.5 border-b border-[#F0EDE6] transition-colors hover:bg-[#F6F3EC] ${
                      isSelected ? 'bg-[#E8F5F3] border-l-2 border-l-[#0F766E]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Mag badge */}
                      <span
                        className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-10 h-6 rounded border text-[10px] font-bold ${magColor(evt.mag)}`}
                      >
                        M{evt.mag.toFixed(1)}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1F2430] truncate">{evt.place}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5C6570]">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatLocalTime(evt.time)}
                          </span>
                          <span>Depth {evt.depth_km?.toFixed(1) ?? '?'} km</span>
                        </div>
                      </div>

                      {/* Dot indicator */}
                      <span className={`shrink-0 mt-2 w-2 h-2 rounded-full ${magDotColor(evt.mag)}`} />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* ── Inversion result card ── */}
        <div className="bg-white border border-[#DDD6C7] rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#DDD6C7] flex items-center gap-2">
            <Zap size={15} className="text-[#0F766E]" />
            <span className="text-sm font-bold text-[#1F2430]">Inversion Result</span>
          </div>

          <div className="flex-1 p-5">
            {!selectedEvent && !invLoading && (
              <div className="flex flex-col items-center justify-center h-48 text-xs text-[#5C6570] gap-2">
                <Activity size={28} className="text-[#DDD6C7]" />
                <span>Select an event to run inversion</span>
              </div>
            )}

            {invLoading && (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#5C6570]">
                <Loader2 size={28} className="animate-spin text-[#0F766E]" />
                <span className="text-xs">Running inversion…</span>
              </div>
            )}

            {invError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                <AlertCircle size={14} />
                {invError}
              </div>
            )}

            {selectedEvent && inversion && !invLoading && (
              <div className="space-y-4">
                {/* Event header */}
                <div className="flex items-center gap-2 p-3 bg-[#F6F3EC] rounded-lg">
                  <span
                    className={`inline-flex items-center justify-center w-12 h-7 rounded border text-[11px] font-bold ${magColor(selectedEvent.mag)}`}
                  >
                    M{selectedEvent.mag.toFixed(1)}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#1F2430]">{selectedEvent.place}</p>
                    <p className="text-[10px] text-[#5C6570]">{formatLocalTime(selectedEvent.time)}</p>
                  </div>
                </div>

                {/* Result grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: 'Epicentral Distance',
                      value: `${inversion.epicentral_distance_km.toFixed(1)} km`,
                      sub: `${inversion.epicentral_distance_deg.toFixed(2)}°`,
                    },
                    {
                      label: 'P Arrival',
                      value: `${inversion.P_arrival_s.toFixed(2)} s`,
                      sub: 'from origin time',
                    },
                    {
                      label: 'S Arrival',
                      value: `${inversion.S_arrival_s.toFixed(2)} s`,
                      sub: 'from origin time',
                    },
                    {
                      label: 'S-P Delay',
                      value: `${inversion.sp_delay_s.toFixed(2)} s`,
                      sub: 't_S − t_P',
                    },
                    {
                      label: 'Radiated Energy',
                      value: toSci(inversion.energy_J) + ' J',
                      sub: 'log₁₀(E) = 4.8+1.5·Mw',
                    },
                    {
                      label: 'TNT Equivalent',
                      value: `${inversion.tnt_equivalent_kg.toFixed(1)} kg`,
                      sub: '1 kt = 4.184×10¹² J',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-[#F6F3EC] border border-[#DDD6C7] rounded-lg px-4 py-3"
                    >
                      <p className="text-[9px] text-[#5C6570] uppercase tracking-widest mb-1">{item.label}</p>
                      <p className="text-sm font-bold text-[#0F766E] leading-tight">{item.value}</p>
                      <p className="text-[9px] text-[#5C6570] mt-0.5 italic">{item.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Mechanism */}
                <div className="flex items-center gap-2 p-3 bg-[#E8F5F3] border border-[#A7D7D3] rounded-lg">
                  <Activity size={14} className="text-[#0F766E]" />
                  <div>
                    <p className="text-[9px] text-[#0F766E] uppercase tracking-widest font-semibold">Focal Mechanism</p>
                    <p className="text-xs font-bold text-[#1F2430]">{inversion.mechanism}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Method Panel */}
      <MethodPanel open={methodOpen} onToggle={() => setMethodOpen((v) => !v)} />
    </div>
  );
};

