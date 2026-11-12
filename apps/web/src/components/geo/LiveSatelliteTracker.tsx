import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Satellite,
  Radio,
  Globe2,
  Compass,
  Clock,
  RefreshCw,
  Send,
  CheckCircle2,
  Activity,
  MapPin,
  Search,
} from 'lucide-react';
import {
  SatelliteTleRecord,
  GeodeticPosition,
  GroundStation,
  GroundStationPassPoint,
  PassSummary,
  DEFAULT_GROUND_STATIONS,
  FALLBACK_SATELLITES,
  propagateSatellite,
  generateGroundTrackSegments,
  getSolarTerminatorLine,
  computeTopocentricPassPoint,
  predictUpcomingPasses,
} from '../../services/satelliteTrackingService';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LiveSatelliteTrackerProps {
  onIngestSignal?: (name: string, timestamps: number[], values: number[], meta: string) => void;
}

export const LiveSatelliteTracker: React.FC<LiveSatelliteTrackerProps> = ({ onIngestSignal }) => {
  // State
  const [selectedGroup, setSelectedGroup] = useState<string>('stations');
  const [customNorad, setCustomNorad] = useState<string>('');
  const [satelliteList, setSatelliteList] = useState<SatelliteTleRecord[]>(FALLBACK_SATELLITES);
  const [selectedSatIndex, setSelectedSatIndex] = useState<number>(0);
  const [selectedStation, setSelectedStation] = useState<GroundStation>(DEFAULT_GROUND_STATIONS[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sourceLabel, setSourceLabel] = useState<string>('CelesTrak (Live Elements)');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [ingestNotif, setIngestNotif] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active satellite
  const activeSat = useMemo(() => {
    return satelliteList[selectedSatIndex] || satelliteList[0] || FALLBACK_SATELLITES[0];
  }, [satelliteList, selectedSatIndex]);

  // Fetch TLEs from API
  const fetchTleData = useCallback(async (group: string, norad?: string) => {
    setIsLoading(true);
    try {
      const q = norad ? `catnr=${encodeURIComponent(norad)}` : `group=${encodeURIComponent(group)}`;
      const res = await fetch(`/api/satellite/tle?${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.satellites && data.satellites.length > 0) {
        setSatelliteList(data.satellites);
        setSelectedSatIndex(0);
        setSourceLabel(data.source || 'CelesTrak');
      }
    } catch {
      // Keep existing or fallback
      setSourceLabel('SYNAPSE Verified Fallback (Offline)');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount or group change
  useEffect(() => {
    fetchTleData(selectedGroup);
  }, [selectedGroup, fetchTleData]);

  // Real-time 1-second propagation clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Current Propagated Position
  const currentPos: GeodeticPosition = useMemo(() => {
    return propagateSatellite(activeSat, currentTime);
  }, [activeSat, currentTime]);

  // Current Topocentric Pass Point
  const currentPassPoint: GroundStationPassPoint = useMemo(() => {
    return computeTopocentricPassPoint(activeSat, currentTime, selectedStation);
  }, [activeSat, currentTime, selectedStation]);

  // Upcoming Passes
  const upcomingPasses: PassSummary[] = useMemo(() => {
    return predictUpcomingPasses(activeSat, currentTime, selectedStation, 24);
  }, [activeSat, currentTime, selectedStation]);

  // Pass Telemetry Profile for Graph (next/current pass or 20-min window)
  const passTelemetryData = useMemo(() => {
    const points = [];
    const baseMs = currentTime.getTime();
    for (let i = -10; i <= 20; i++) {
      const t = new Date(baseMs + i * 60 * 1000);
      const pt = computeTopocentricPassPoint(activeSat, t, selectedStation);
      points.push({
        minute: i >= 0 ? `+${i}m` : `${i}m`,
        elevationDeg: Math.max(0, pt.elevationDeg),
        dopplerKhz: parseFloat((pt.dopplerShiftHz / 1000.0).toFixed(2)),
        rangeKm: Math.round(pt.rangeKm),
      });
    }
    return points;
  }, [activeSat, currentTime, selectedStation]);

  // Draw 2D World Map Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Coordinate conversion: Lon [-180, 180] -> [0, W], Lat [90, -90] -> [0, H]
    const lonToX = (lon: number) => ((lon + 180.0) / 360.0) * W;
    const latToY = (lat: number) => ((90.0 - lat) / 180.0) * H;

    // Clear background (Ocean / Paper cream)
    ctx.fillStyle = '#FDFBF7';
    ctx.fillRect(0, 0, W, H);

    // Draw Graticule Grid
    ctx.strokeStyle = '#E6E1D6';
    ctx.lineWidth = 1;
    // Latitudes
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = latToY(lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Longitudes
    for (let lon = -150; lon <= 150; lon += 30) {
      const x = lonToX(lon);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    // Equator & Prime Meridian
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, latToY(0));
    ctx.lineTo(W, latToY(0));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lonToX(0), 0);
    ctx.lineTo(lonToX(0), H);
    ctx.stroke();

    // Simplified Continental Outlines (Procedural Vector Polygons)
    ctx.fillStyle = '#EFEBE0';
    ctx.strokeStyle = '#D1C9BA';
    ctx.lineWidth = 1;

    // Major landmass polygons
    const continents = [
      // North America
      [[-165, 68], [-140, 70], [-100, 72], [-65, 60], [-55, 48], [-75, 35], [-80, 25], [-100, 20], [-105, 23], [-115, 32], [-125, 48], [-165, 60]],
      // South America
      [[-80, 10], [-50, -5], [-35, -5], [-40, -22], [-55, -40], [-68, -55], [-75, -45], [-80, -20], [-80, 0]],
      // Eurasia
      [[-10, 36], [0, 45], [10, 55], [30, 70], [60, 72], [100, 76], [140, 72], [170, 65], [140, 40], [120, 30], [105, 10], [80, 15], [70, 25], [50, 25], [35, 32], [15, 38], [-5, 36]],
      // Africa
      [[-15, 32], [10, 37], [32, 31], [42, 12], [50, 10], [40, -10], [30, -32], [20, -35], [12, -18], [0, 5], [-15, 15]],
      // Australia
      [[115, -20], [130, -12], [145, -15], [152, -28], [140, -38], [115, -35]],
    ];

    continents.forEach((poly) => {
      ctx.beginPath();
      poly.forEach(([lon, lat], idx) => {
        const x = lonToX(lon);
        const y = latToY(lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Draw Solar Terminator (Day / Night line)
    const terminator = getSolarTerminatorLine(currentTime);
    if (terminator.length > 0) {
      ctx.strokeStyle = '#B45309';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      terminator.forEach(([lon, lat], idx) => {
        const x = lonToX(lon);
        const y = latToY(lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Ground Track Segments (-45 min past to +90 min future)
    const groundTrackSegments = generateGroundTrackSegments(activeSat, currentTime, 45, 90, 20);
    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 2.2;
    groundTrackSegments.forEach((seg) => {
      if (seg.length < 2) return;
      ctx.beginPath();
      seg.forEach(([lon, lat], idx) => {
        const x = lonToX(lon);
        const y = latToY(lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Draw Observer Ground Station Marker
    const obsX = lonToX(selectedStation.longitudeDeg);
    const obsY = latToY(selectedStation.latitudeDeg);

    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(obsX, obsY, 4.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ground Station Label
    ctx.font = '9px monospace';
    ctx.fillStyle = '#78350F';
    ctx.fillText(selectedStation.name.split(',')[0], obsX + 6, obsY - 4);

    // Draw Satellite Footprint Circle
    const satX = lonToX(currentPos.longitudeDeg);
    const satY = latToY(currentPos.latitudeDeg);
    const footprintDeg = (currentPos.footprintRadiusKm / (Math.PI * 6378.137)) * 180.0;
    const rx = (footprintDeg / 360.0) * W;
    const ry = (footprintDeg / 180.0) * H;

    ctx.fillStyle = 'rgba(15, 118, 110, 0.08)';
    ctx.strokeStyle = 'rgba(15, 118, 110, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(satX, satY, rx, ry, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Line of sight ray between ground station and satellite if above horizon
    if (currentPassPoint.isAboveHorizon) {
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(obsX, obsY);
      ctx.lineTo(satX, satY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Satellite Icon / Pulsing Beacon
    ctx.fillStyle = '#0F766E';
    ctx.beginPath();
    ctx.arc(satX, satY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Satellite Name Label
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#0F766E';
    ctx.fillText(activeSat.name.trim(), satX + 8, satY - 6);
  }, [activeSat, currentPos, currentTime, selectedStation, currentPassPoint]);

  // Draw Sky Dome Polar Radar Canvas
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(cx, cy) - 20;

    ctx.clearRect(0, 0, W, H);

    // Background Sky Dome
    ctx.fillStyle = '#FDFBF7';
    ctx.fillRect(0, 0, W, H);

    // Concentric elevation rings (0°, 30°, 60°)
    const elevations = [0, 30, 60];
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 1;

    elevations.forEach((el) => {
      const r = R * (1.0 - el / 90.0);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.font = '8px monospace';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(`${el}°`, cx + 4, cy - r + 9);
    });

    // Cross-hairs (N-S, E-W)
    ctx.beginPath();
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.stroke();

    // Cardinal directions
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#4B5563';
    ctx.fillText('N', cx - 3, cy - R - 6);
    ctx.fillText('S', cx - 3, cy + R + 14);
    ctx.fillText('E', cx + R + 5, cy + 3);
    ctx.fillText('W', cx - R - 14, cy + 3);

    // If satellite is above horizon, draw satellite in polar dome!
    if (currentPassPoint.isAboveHorizon) {
      const el = currentPassPoint.elevationDeg;
      const az = currentPassPoint.azimuthDeg;
      const r = R * (1.0 - el / 90.0);
      const azRad = ((az - 90.0) * Math.PI) / 180.0;
      const sx = cx + r * Math.cos(azRad);
      const sy = cy + r * Math.sin(azRad);

      // Radar blip
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(sx, sy, 5.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#059669';
      ctx.fillText(activeSat.name.split(' ')[0], sx + 7, sy - 4);
    }
  }, [currentPassPoint, activeSat]);

  // Handle ingest of Doppler telemetry to Workbench
  const handleIngestTelemetry = (type: 'doppler' | 'altitude' | 'speed') => {
    if (!onIngestSignal) return;

    const timestamps: number[] = [];
    const values: number[] = [];
    const baseMs = currentTime.getTime();

    if (type === 'doppler') {
      for (let i = 0; i < 300; i++) {
        const t = new Date(baseMs + (i - 150) * 2000);
        const pt = computeTopocentricPassPoint(activeSat, t, selectedStation);
        timestamps.push(i * 2.0);
        values.push(pt.dopplerShiftHz / 1000.0);
      }
      onIngestSignal(
        `sat_doppler_${activeSat.norad_id}`,
        timestamps,
        values,
        `Doppler RF S-curve for ${activeSat.name} at ${selectedStation.name} (kHz)`
      );
      setIngestNotif(`Doppler frequency shift series loaded to Workbench`);
    } else if (type === 'altitude') {
      for (let i = 0; i < 300; i++) {
        const t = new Date(baseMs + i * 20 * 1000);
        const pos = propagateSatellite(activeSat, t);
        timestamps.push(i * 20.0);
        values.push(pos.altitudeKm);
      }
      onIngestSignal(
        `sat_altitude_${activeSat.norad_id}`,
        timestamps,
        values,
        `Orbital altitude trajectory for ${activeSat.name} (km)`
      );
      setIngestNotif(`Orbital altitude series loaded to Workbench`);
    } else {
      for (let i = 0; i < 300; i++) {
        const t = new Date(baseMs + i * 20 * 1000);
        const pos = propagateSatellite(activeSat, t);
        timestamps.push(i * 20.0);
        values.push(pos.velocityKmS);
      }
      onIngestSignal(
        `sat_speed_${activeSat.norad_id}`,
        timestamps,
        values,
        `Orbital velocity profile for ${activeSat.name} (km/s)`
      );
      setIngestNotif(`Orbital velocity series loaded to Workbench`);
    }

    setTimeout(() => setIngestNotif(null), 3500);
  };

  return (
    <div className="space-y-4">
      {/* Control Ribbon */}
      <div className="p-3 bg-white border border-[#DDD6C7] rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Group Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-[#4A5060]">Constellation:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-[#FBF9F5] border border-[#DDD6C7] rounded px-2 py-1 text-xs font-mono font-medium text-[#1F2430] focus:outline-none focus:border-[#0F766E]"
            >
              <option value="stations">Space Stations (ISS, Tiangong)</option>
              <option value="weather">Weather (NOAA, MetOp)</option>
              <option value="visual">Visual Bright Satellites</option>
              <option value="science">Space Telescopes &amp; Science</option>
              <option value="gnss">GNSS Navigation (GPS, Galileo)</option>
              <option value="resource">Earth Observation (Landsat)</option>
            </select>
          </div>

          {/* Satellite Picker */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-[#4A5060]">Satellite:</span>
            <select
              value={selectedSatIndex}
              onChange={(e) => setSelectedSatIndex(Number(e.target.value))}
              className="bg-[#FBF9F5] border border-[#DDD6C7] rounded px-2 py-1 text-xs font-mono font-medium text-[#1F2430] max-w-[220px] focus:outline-none focus:border-[#0F766E]"
            >
              {satelliteList.map((sat, idx) => (
                <option key={`${sat.norad_id}_${idx}`} value={idx}>
                  {sat.name.trim()} (NORAD {sat.norad_id})
                </option>
              ))}
            </select>
          </div>

          {/* NORAD Lookup */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="NORAD ID"
              value={customNorad}
              onChange={(e) => setCustomNorad(e.target.value)}
              className="bg-[#FBF9F5] border border-[#DDD6C7] rounded px-2 py-1 text-xs font-mono w-20 text-[#1F2430] focus:outline-none focus:border-[#0F766E]"
            />
            <button
              type="button"
              onClick={() => {
                if (customNorad.trim()) {
                  fetchTleData('', customNorad.trim());
                }
              }}
              className="px-2 py-1 bg-[#EFEBE0] hover:bg-[#DDD6C7] rounded text-xs font-mono text-[#1F2430] flex items-center gap-1"
              title="Lookup custom NORAD catalog number"
            >
              <Search className="w-3 h-3" />
            </button>
          </div>

          {/* Observer Station Picker */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
            <span className="font-mono font-semibold text-[#4A5060]">Ground Station:</span>
            <select
              value={selectedStation.name}
              onChange={(e) => {
                const found = DEFAULT_GROUND_STATIONS.find((st) => st.name === e.target.value);
                if (found) setSelectedStation(found);
              }}
              className="bg-[#FBF9F5] border border-[#DDD6C7] rounded px-2 py-1 text-xs font-mono font-medium text-[#1F2430] focus:outline-none focus:border-[#0F766E]"
            >
              {DEFAULT_GROUND_STATIONS.map((st) => (
                <option key={st.name} value={st.name}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] animate-pulse" />
            {sourceLabel}
          </span>
          <button
            type="button"
            onClick={() => fetchTleData(selectedGroup)}
            disabled={isLoading}
            className="p-1 hover:bg-[#EFEBE0] rounded text-[#4A5060] transition-colors"
            title="Refresh TLE from CelesTrak"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main 2D World Map Ground Track */}
      <div className="bg-white border border-[#DDD6C7] rounded-lg p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#DDD6C7]">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-[#0F766E]" />
            <span className="text-xs font-mono font-bold text-[#1F2430]">
              Global Ground Track &amp; Solar Terminator Projection
            </span>
            <span className="text-[11px] font-mono text-[#6B6F7B]">
              Orbit: past 45m (dashed) &bull; future 90m (solid teal)
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#6B6F7B]">
            UTC: {currentTime.toUTCString().split(' ').slice(4, 5)[0]}
          </div>
        </div>

        <div className="relative w-full rounded overflow-hidden border border-[#E6E1D6]">
          <canvas
            ref={canvasRef}
            width={960}
            height={480}
            className="w-full h-auto block bg-[#FDFBF7]"
          />
        </div>
      </div>

      {/* Telemetry Cockpit HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* Card 1: Sub-Satellite Position */}
        <div className="bg-white border border-[#DDD6C7] rounded-lg p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6B6F7B] font-mono text-[11px]">
            <span>SUB-SATELLITE POINT</span>
            <Satellite className="w-3.5 h-3.5 text-[#0F766E]" />
          </div>
          <div className="font-mono text-sm font-bold text-[#1F2430]">
            {Math.abs(currentPos.latitudeDeg).toFixed(2)}° {currentPos.latitudeDeg >= 0 ? 'N' : 'S'},{' '}
            {Math.abs(currentPos.longitudeDeg).toFixed(2)}° {currentPos.longitudeDeg >= 0 ? 'E' : 'W'}
          </div>
          <div className="text-[11px] font-mono text-[#6B6F7B] flex justify-between pt-1 border-t border-[#EFEBE0]">
            <span>Footprint Radius</span>
            <span className="font-semibold text-[#1F2430]">{currentPos.footprintRadiusKm} km</span>
          </div>
        </div>

        {/* Card 2: Altitude & Velocity */}
        <div className="bg-white border border-[#DDD6C7] rounded-lg p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6B6F7B] font-mono text-[11px]">
            <span>ALTITUDE &amp; SPEED</span>
            <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
          </div>
          <div className="font-mono text-sm font-bold text-[#1F2430]">
            {currentPos.altitudeKm} km &bull; {currentPos.velocityKmS} km/s
          </div>
          <div className="text-[11px] font-mono text-[#6B6F7B] flex justify-between pt-1 border-t border-[#EFEBE0]">
            <span>Ground Speed</span>
            <span className="font-semibold text-[#1F2430]">{currentPos.groundSpeedKmS} km/s</span>
          </div>
        </div>

        {/* Card 3: Keplerian Elements */}
        <div className="bg-white border border-[#DDD6C7] rounded-lg p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6B6F7B] font-mono text-[11px]">
            <span>ORBITAL INVARIANTS</span>
            <Compass className="w-3.5 h-3.5 text-[#0F766E]" />
          </div>
          <div className="font-mono text-sm font-bold text-[#1F2430]">
            T = {activeSat.orbital_period_min} min &bull; i = {activeSat.inclination_deg}°
          </div>
          <div className="text-[11px] font-mono text-[#6B6F7B] flex justify-between pt-1 border-t border-[#EFEBE0]">
            <span>Eccentricity</span>
            <span className="font-semibold text-[#1F2430]">{activeSat.eccentricity}</span>
          </div>
        </div>

        {/* Card 4: Topocentric Visibility */}
        <div className="bg-white border border-[#DDD6C7] rounded-lg p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6B6F7B] font-mono text-[11px]">
            <span>STATION PASS STATUS</span>
            <Radio className="w-3.5 h-3.5 text-[#0F766E]" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                currentPassPoint.isAboveHorizon
                  ? 'bg-[#DEF7EC] text-[#03543F] border border-[#03543F]/20'
                  : 'bg-[#FEF08A] text-[#854D0E] border border-[#854D0E]/20'
              }`}
            >
              {currentPassPoint.isAboveHorizon ? 'Above Horizon (Pass)' : 'Below Horizon'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#6B6F7B] flex justify-between pt-1 border-t border-[#EFEBE0]">
            <span>Az: {currentPassPoint.azimuthDeg}°</span>
            <span className="font-semibold text-[#1F2430]">El: {currentPassPoint.elevationDeg}°</span>
          </div>
        </div>
      </div>

      {/* Dual Panel: Sky Dome Radar + Telemetry Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Polar Sky Dome Radar */}
        <div className="bg-white border border-[#DDD6C7] rounded-lg p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#DDD6C7]">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#0F766E]" />
              <span className="text-xs font-mono font-bold text-[#1F2430]">Sky Dome Polar Radar</span>
            </div>
            <span className="text-[10px] font-mono text-[#6B6F7B]">Observer Dome</span>
          </div>

          <div className="flex justify-center p-2">
            <canvas
              ref={radarCanvasRef}
              width={220}
              height={220}
              className="rounded-full border border-[#DDD6C7] bg-[#FDFBF7]"
            />
          </div>

          <div className="text-[11px] font-mono text-[#6B6F7B] space-y-0.5 pt-1 border-t border-[#EFEBE0]">
            <div className="flex justify-between">
              <span>Station Range:</span>
              <span className="font-semibold text-[#1F2430]">{currentPassPoint.rangeKm} km</span>
            </div>
            <div className="flex justify-between">
              <span>Doppler Shift (145.8 MHz):</span>
              <span className={`font-semibold ${currentPassPoint.dopplerShiftHz >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                {(currentPassPoint.dopplerShiftHz / 1000.0).toFixed(2)} kHz
              </span>
            </div>
          </div>
        </div>

        {/* RF Doppler & Elevation Curves */}
        <div className="md:col-span-2 bg-white border border-[#DDD6C7] rounded-lg p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#DDD6C7]">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
              <span className="text-xs font-mono font-bold text-[#1F2430]">
                Pass Horizon Doppler Shift &amp; Elevation Profile
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#6B6F7B]">&plusmn;15 min Window</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={passTelemetryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E1D6" />
                <XAxis dataKey="minute" tick={{ fontSize: 10, fill: '#6B6F7B' }} />
                <YAxis
                  yAxisId="el"
                  orientation="left"
                  domain={[0, 90]}
                  tick={{ fontSize: 10, fill: '#0F766E' }}
                  unit="°"
                />
                <YAxis
                  yAxisId="dop"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#DC2626' }}
                  unit="k"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DDD6C7',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
                <Line
                  yAxisId="el"
                  type="monotone"
                  dataKey="elevationDeg"
                  stroke="#0F766E"
                  strokeWidth={2}
                  name="Elevation (°)"
                  dot={false}
                />
                <Line
                  yAxisId="dop"
                  type="monotone"
                  dataKey="dopplerKhz"
                  stroke="#DC2626"
                  strokeWidth={1.8}
                  name="Doppler (kHz)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Workbench Telemetry Ingestion Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-[#DDD6C7]">
            <div className="text-[11px] font-mono text-[#6B6F7B]">
              Feed genuine orbital telemetry to SYNAPSE Workbench:
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleIngestTelemetry('doppler')}
                className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20 hover:bg-[#0F766E] hover:text-white transition-colors flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Ingest Doppler Curve
              </button>
              <button
                type="button"
                onClick={() => handleIngestTelemetry('altitude')}
                className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[#FBF9F5] text-[#4A5060] border border-[#DDD6C7] hover:bg-[#EFEBE0] transition-colors flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Ingest Altitude Trajectory
              </button>
            </div>
          </div>

          {ingestNotif && (
            <div className="px-3 py-1.5 bg-[#DEF7EC] border border-[#03543F]/20 text-[#03543F] rounded text-xs font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {ingestNotif}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Passes Schedule Table */}
      <div className="bg-white border border-[#DDD6C7] rounded-lg p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#DDD6C7]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
            <span className="text-xs font-mono font-bold text-[#1F2430]">
              Upcoming Visible Passes over {selectedStation.name} (Next 24h)
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#6B6F7B]">Min Elevation Threshold: 8°</span>
        </div>

        {upcomingPasses.length === 0 ? (
          <div className="text-xs font-mono text-[#6B6F7B] py-3 text-center">
            No passes above 8° elevation detected within the next 24-hour observation window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-[#EFEBE0] text-left text-[#6B6F7B]">
                  <th className="py-1 px-2 font-semibold">AOS (Acquisition)</th>
                  <th className="py-1 px-2 font-semibold">TCA (Max Elevation)</th>
                  <th className="py-1 px-2 font-semibold">LOS (Loss of Signal)</th>
                  <th className="py-1 px-2 font-semibold">Max El</th>
                  <th className="py-1 px-2 font-semibold">Duration</th>
                  <th className="py-1 px-2 font-semibold">Visibility</th>
                </tr>
              </thead>
              <tbody>
                {upcomingPasses.map((p, idx) => (
                  <tr key={idx} className="border-b border-[#F5F2EA] hover:bg-[#FDFBF7]">
                    <td className="py-1.5 px-2 font-medium text-[#1F2430]">{p.aosTimestamp}</td>
                    <td className="py-1.5 px-2 font-bold text-[#0F766E]">{p.tcaTimestamp}</td>
                    <td className="py-1.5 px-2 text-[#4A5060]">{p.losTimestamp}</td>
                    <td className="py-1.5 px-2 font-bold text-[#1F2430]">{p.maxElevationDeg}°</td>
                    <td className="py-1.5 px-2 text-[#4A5060]">
                      {Math.floor(p.durationSec / 60)}m {p.durationSec % 60}s
                    </td>
                    <td className="py-1.5 px-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          p.passType === 'High'
                            ? 'bg-[#DEF7EC] text-[#03543F]'
                            : p.passType === 'Medium'
                            ? 'bg-[#E0F2FE] text-[#0369A1]'
                            : 'bg-[#F3F4F6] text-[#4B5563]'
                        }`}
                      >
                        {p.passType} Pass
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
