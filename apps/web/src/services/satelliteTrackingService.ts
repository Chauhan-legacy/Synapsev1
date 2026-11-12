/**
 * SYNAPSE Satellite Tracking & Orbital Mechanics Engine
 * Provides high-precision Keplerian and J2 secular perturbation propagation,
 * ECI to ECEF/Geodetic WGS-84 coordinate transformation, ground-track generation,
 * solar day/night terminator computation, and topocentric ground-station pass/Doppler prediction.
 */

export interface SatelliteTleRecord {
  name: string;
  norad_id: string;
  line1: string;
  line2: string;
  inclination_deg: number;
  raan_deg: number;
  eccentricity: number;
  arg_perigee_deg: number;
  mean_anomaly_deg: number;
  mean_motion_rev_day: number;
  orbital_period_min: number;
  semi_major_axis_km: number;
  altitude_km: number;
  velocity_km_s: number;
}

export interface GeodeticPosition {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
  velocityKmS: number;
  groundSpeedKmS: number;
  footprintRadiusKm: number;
  eciX: number;
  eciY: number;
  eciZ: number;
}

export interface GroundStation {
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeM: number;
}

export interface GroundStationPassPoint {
  timeSec: number;
  timestamp: string;
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
  rangeRateKmS: number;
  dopplerShiftHz: number;
  isAboveHorizon: boolean;
}

export interface PassSummary {
  aosTimestamp: string;
  tcaTimestamp: string;
  losTimestamp: string;
  maxElevationDeg: number;
  durationSec: number;
  passType: 'High' | 'Medium' | 'Low';
}

const MU_EARTH = 398600.4418; // km^3/s^2 (Standard gravitational parameter)
const RE_EARTH = 6378.137; // km (WGS-84 Equatorial radius)
const J2 = 1.08262668e-3; // Earth oblateness harmonic J2
const C_LIGHT = 299792.458; // km/s (Speed of light)
const WGS84_F = 1.0 / 298.257223563; // Flattening
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F; // First eccentricity squared

/**
 * Built-in verified ground stations
 */
export const DEFAULT_GROUND_STATIONS: GroundStation[] = [
  { name: 'Greenwich / London, UK', latitudeDeg: 51.4769, longitudeDeg: -0.0005, altitudeM: 46 },
  { name: 'KSC / Cape Canaveral, USA', latitudeDeg: 28.5729, longitudeDeg: -80.649, altitudeM: 3 },
  { name: 'Tokyo Ground Station, Japan', latitudeDeg: 35.6762, longitudeDeg: 139.6503, altitudeM: 40 },
  { name: 'Mumbai Ground Station, India', latitudeDeg: 19.076, longitudeDeg: 72.8777, altitudeM: 14 },
  { name: 'Sydney Ground Station, Australia', latitudeDeg: -33.8688, longitudeDeg: 151.2093, altitudeM: 58 },
  { name: 'San Francisco, USA', latitudeDeg: 37.7749, longitudeDeg: -122.4194, altitudeM: 16 },
];

/**
 * Fallback verified TLE dataset for instant offline rendering
 */
export const FALLBACK_SATELLITES: SatelliteTleRecord[] = [
  {
    name: 'ISS (ZARYA)',
    norad_id: '25544',
    line1: '1 25544U 98067A   26315.85209533  .00008096  00000+0  15318-3 0  9995',
    line2: '2 25544  51.6324 289.3631 0007313  15.2015 344.9192 15.49321770594642',
    inclination_deg: 51.6324,
    raan_deg: 289.3631,
    eccentricity: 0.0007313,
    arg_perigee_deg: 15.2015,
    mean_anomaly_deg: 344.9192,
    mean_motion_rev_day: 15.4932177,
    orbital_period_min: 92.94,
    semi_major_axis_km: 6796.85,
    altitude_km: 418.71,
    velocity_km_s: 7.66,
  },
  {
    name: 'CSS (TIANHE)',
    norad_id: '48274',
    line1: '1 48274U 21035A   26315.87852041  .00018732  00000+0  21414-3 0  9993',
    line2: '2 48274  41.4672 144.5156 0004495 293.2796  66.7569 15.61710525316234',
    inclination_deg: 41.4672,
    raan_deg: 144.5156,
    eccentricity: 0.0004495,
    arg_perigee_deg: 293.2796,
    mean_anomaly_deg: 66.7569,
    mean_motion_rev_day: 15.61710525,
    orbital_period_min: 92.21,
    semi_major_axis_km: 6760.86,
    altitude_km: 382.72,
    velocity_km_s: 7.68,
  },
  {
    name: 'HST (HUBBLE)',
    norad_id: '20580',
    line1: '1 20580U 90037B   26315.86947355  .00006080  00000+0  18217-3 0  9993',
    line2: '2 20580  28.4708 150.0702 0002203   4.0135 356.0479 15.32266878811238',
    inclination_deg: 28.4708,
    raan_deg: 150.0702,
    eccentricity: 0.0002203,
    arg_perigee_deg: 4.0135,
    mean_anomaly_deg: 356.0479,
    mean_motion_rev_day: 15.32266878,
    orbital_period_min: 93.98,
    semi_major_axis_km: 6847.19,
    altitude_km: 469.05,
    velocity_km_s: 7.63,
  },
  {
    name: 'NOAA 19',
    norad_id: '33591',
    line1: '1 33591U 09005A   26315.85242338  .00000052  00000+0  51537-4 0  9998',
    line2: '2 33591  98.9377  26.7180 0013236 336.4084  23.6480 14.13493413915341',
    inclination_deg: 98.9377,
    raan_deg: 26.718,
    eccentricity: 0.0013236,
    arg_perigee_deg: 336.4084,
    mean_anomaly_deg: 23.648,
    mean_motion_rev_day: 14.13493414,
    orbital_period_min: 101.88,
    semi_major_axis_km: 7226.54,
    altitude_km: 848.4,
    velocity_km_s: 7.42,
  },
  {
    name: 'TERRA',
    norad_id: '25994',
    line1: '1 25994U 99068A   26315.88758803  .00000385  00000+0  87222-4 0  9995',
    line2: '2 25994  97.9268 359.4376 0003504 112.9522  60.4417 14.61195197431175',
    inclination_deg: 97.9268,
    raan_deg: 359.4376,
    eccentricity: 0.0003504,
    arg_perigee_deg: 112.9522,
    mean_anomaly_deg: 60.4417,
    mean_motion_rev_day: 14.61195197,
    orbital_period_min: 98.55,
    semi_major_axis_km: 7083.52,
    altitude_km: 705.38,
    velocity_km_s: 7.5,
  },
];

/**
 * Parses raw TLE text into SatelliteTleRecord objects
 */
export function parseTleStream(rawText: string): SatelliteTleRecord[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const records: SatelliteTleRecord[] = [];
  let i = 0;

  while (i < lines.length) {
    if (i + 2 < lines.length && lines[i + 1].startsWith('1 ') && lines[i + 2].startsWith('2 ')) {
      const name = lines[i];
      const l1 = lines[i + 1];
      const l2 = lines[i + 2];
      const norad_id = l1.substring(2, 7).trim();

      try {
        const inc = parseFloat(l2.substring(8, 16).trim());
        const raan = parseFloat(l2.substring(17, 25).trim());
        const ecc = parseFloat('0.' + l2.substring(26, 33).trim());
        const arg_p = parseFloat(l2.substring(34, 42).trim());
        const m0 = parseFloat(l2.substring(43, 51).trim());
        const mm = parseFloat(l2.substring(52, 63).trim());
        const period = mm > 0 ? 1440.0 / mm : 0.0;
        const n_rad_s = (mm * 2.0 * Math.PI) / 86400.0;
        const a = n_rad_s > 0 ? Math.pow(MU_EARTH / Math.pow(n_rad_s, 2), 1.0 / 3.0) : 0.0;
        const alt = a - RE_EARTH;
        const speed = a > 0 ? Math.sqrt(MU_EARTH / a) : 0.0;

        records.push({
          name,
          norad_id,
          line1: l1,
          line2: l2,
          inclination_deg: inc,
          raan_deg: raan,
          eccentricity: ecc,
          arg_perigee_deg: arg_p,
          mean_anomaly_deg: m0,
          mean_motion_rev_day: mm,
          orbital_period_min: parseFloat(period.toFixed(2)),
          semi_major_axis_km: parseFloat(a.toFixed(2)),
          altitude_km: parseFloat(alt.toFixed(2)),
          velocity_km_s: parseFloat(speed.toFixed(2)),
        });
      } catch {
        // Skip unparseable line
      }
      i += 3;
    } else {
      i += 1;
    }
  }

  return records;
}

/**
 * Extracts epoch from TLE Line 1 as a JavaScript Date object
 */
export function getTleEpochDate(line1: string): Date {
  try {
    const epochStr = line1.substring(18, 32).trim();
    let year = parseInt(epochStr.substring(0, 2), 10);
    year += year < 57 ? 2000 : 1900;
    const dayOfYear = parseFloat(epochStr.substring(2));
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    return new Date(startOfYear.getTime() + (dayOfYear - 1) * 86400 * 1000);
  } catch {
    return new Date();
  }
}

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in radians for a given UTC Date
 */
export function getGmstRad(date: Date): number {
  const jd = date.getTime() / 86400000.0 + 2440587.5;
  const d = jd - 2451545.0;
  // IAU formula for GMST
  const gmstHours = (18.697374558 + 24.06570982441908 * d) % 24.0;
  const gmstNorm = (gmstHours + 24.0) % 24.0;
  return (gmstNorm * Math.PI) / 12.0;
}

/**
 * Propagates satellite position using Keplerian mechanics + J2 nodal regression
 */
export function propagateSatellite(sat: SatelliteTleRecord, targetDate: Date): GeodeticPosition {
  const epoch = getTleEpochDate(sat.line1);
  const dtSec = (targetDate.getTime() - epoch.getTime()) / 1000.0;

  const incRad = (sat.inclination_deg * Math.PI) / 180.0;
  const e = sat.eccentricity;
  const a = sat.semi_major_axis_km;
  const n_rad_s = (sat.mean_motion_rev_day * 2.0 * Math.PI) / 86400.0;
  const p = a * (1.0 - e * e);

  // J2 secular perturbations
  const cosInc = Math.cos(incRad);
  const j2Factor = -1.5 * J2 * Math.pow(RE_EARTH / p, 2) * n_rad_s;
  const raanDot = j2Factor * cosInc; // Nodal precession rate rad/s
  const argPerigeeDot = 0.75 * J2 * Math.pow(RE_EARTH / p, 2) * n_rad_s * (5.0 * cosInc * cosInc - 1.0);

  // Current orbital elements
  const currentRaanRad = (sat.raan_deg * Math.PI) / 180.0 + raanDot * dtSec;
  const currentArgPerigeeRad = (sat.arg_perigee_deg * Math.PI) / 180.0 + argPerigeeDot * dtSec;
  const m0Rad = (sat.mean_anomaly_deg * Math.PI) / 180.0;
  let mRad = (m0Rad + n_rad_s * dtSec) % (2.0 * Math.PI);
  if (mRad < 0) mRad += 2.0 * Math.PI;

  // Solve Kepler's equation for Eccentric Anomaly E: M = E - e * sin(E)
  let eRad = mRad;
  for (let iter = 0; iter < 8; iter++) {
    const delta = (eRad - e * Math.sin(eRad) - mRad) / (1.0 - e * Math.cos(eRad));
    eRad -= delta;
    if (Math.abs(delta) < 1e-8) break;
  }

  // True Anomaly nu
  const sinNu = (Math.sqrt(1.0 - e * e) * Math.sin(eRad)) / (1.0 - e * Math.cos(eRad));
  const cosNu = (Math.cos(eRad) - e) / (1.0 - e * Math.cos(eRad));
  const nuRad = Math.atan2(sinNu, cosNu);

  // Orbital radius r
  const r = a * (1.0 - e * Math.cos(eRad));

  // Orbital plane position
  const uRad = currentArgPerigeeRad + nuRad; // Argument of latitude
  const xOrb = r * Math.cos(uRad);
  const yOrb = r * Math.sin(uRad);

  // Rotate to Earth-Centered Inertial (ECI)
  const sinRaan = Math.sin(currentRaanRad);
  const cosRaan = Math.cos(currentRaanRad);
  const sinInc = Math.sin(incRad);

  const eciX = xOrb * cosRaan - yOrb * sinRaan * cosInc;
  const eciY = xOrb * sinRaan + yOrb * cosRaan * cosInc;
  const eciZ = yOrb * sinInc;

  // Rotate ECI to Earth-Centered Earth-Fixed (ECEF) using Greenwich Sidereal Time
  const gmst = getGmstRad(targetDate);
  const cosGmst = Math.cos(gmst);
  const sinGmst = Math.sin(gmst);

  const ecefX = eciX * cosGmst + eciY * sinGmst;
  const ecefY = -eciX * sinGmst + eciY * cosGmst;
  const ecefZ = eciZ;

  // Convert ECEF to Geodetic WGS-84 (Latitude, Longitude, Altitude)
  const lonRad = Math.atan2(ecefY, ecefX);
  const pXY = Math.sqrt(ecefX * ecefX + ecefY * ecefY);

  // Bowring's geodetic latitude approximation
  let latRad = Math.atan2(ecefZ, pXY * (1.0 - WGS84_E2));
  for (let iter = 0; iter < 4; iter++) {
    const sinLat = Math.sin(latRad);
    const nCurvature = RE_EARTH / Math.sqrt(1.0 - WGS84_E2 * sinLat * sinLat);
    latRad = Math.atan2(ecefZ + WGS84_E2 * nCurvature * sinLat, pXY);
  }

  const sinFinalLat = Math.sin(latRad);
  const nCurvature = RE_EARTH / Math.sqrt(1.0 - WGS84_E2 * sinFinalLat * sinFinalLat);
  const altKm = pXY / Math.cos(latRad) - nCurvature;

  const latDeg = (latRad * 180.0) / Math.PI;
  let lonDeg = (lonRad * 180.0) / Math.PI;
  if (lonDeg > 180) lonDeg -= 360;
  if (lonDeg < -180) lonDeg += 360;

  // Orbital and ground speeds
  const vel = Math.sqrt(MU_EARTH * (2.0 / r - 1.0 / a));
  const groundSpeed = vel * (RE_EARTH / (RE_EARTH + Math.max(10, altKm)));

  // Radio horizon footprint radius on Earth surface in km
  // theta = arccos(Re / (Re + h))
  const cosTheta = RE_EARTH / (RE_EARTH + Math.max(10, altKm));
  const thetaRad = Math.acos(Math.min(1.0, cosTheta));
  const footprintKm = RE_EARTH * thetaRad;

  return {
    latitudeDeg: parseFloat(latDeg.toFixed(4)),
    longitudeDeg: parseFloat(lonDeg.toFixed(4)),
    altitudeKm: parseFloat(altKm.toFixed(2)),
    velocityKmS: parseFloat(vel.toFixed(3)),
    groundSpeedKmS: parseFloat(groundSpeed.toFixed(3)),
    footprintRadiusKm: parseFloat(footprintKm.toFixed(1)),
    eciX: parseFloat(eciX.toFixed(2)),
    eciY: parseFloat(eciY.toFixed(2)),
    eciZ: parseFloat(eciZ.toFixed(2)),
  };
}

/**
 * Generates continuous ground track multi-segment paths over past and future orbits
 */
export function generateGroundTrackSegments(
  sat: SatelliteTleRecord,
  baseDate: Date,
  pastMinutes: number = 45,
  futureMinutes: number = 90,
  stepSeconds: number = 30
): Array<Array<[number, number]>> {
  const segments: Array<Array<[number, number]>> = [];
  let currentSegment: Array<[number, number]> = [];

  const startTime = baseDate.getTime() - pastMinutes * 60 * 1000;
  const endTime = baseDate.getTime() + futureMinutes * 60 * 1000;

  let lastLon: number | null = null;

  for (let t = startTime; t <= endTime; t += stepSeconds * 1000) {
    const pos = propagateSatellite(sat, new Date(t));
    const lon = pos.longitudeDeg;
    const lat = pos.latitudeDeg;

    // Detect International Date Line meridian jump (> 180 degree jump)
    if (lastLon !== null && Math.abs(lon - lastLon) > 180) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }

    currentSegment.push([lon, lat]);
    lastLon = lon;
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Calculates the solar day/night terminator line coordinates for a given UTC Date
 */
export function getSolarTerminatorLine(date: Date, numPoints: number = 72): Array<[number, number]> {
  // Approximate solar declination and Greenwich hour angle
  const dayOfYear = (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000.0;
  // Declination approximation: delta = -23.44 * cos(2pi/365 * (N + 10))
  const deltaDeg = -23.44 * Math.cos(((2 * Math.PI) / 365.25) * (dayOfYear + 10));
  const deltaRad = (deltaDeg * Math.PI) / 180.0;

  // Greenwich solar hour angle: sun is at lonSun
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60.0 + date.getUTCSeconds() / 3600.0;
  const lonSunDeg = (12.0 - utcHours) * 15.0;

  const points: Array<[number, number]> = [];

  for (let i = 0; i <= numPoints; i++) {
    const lambdaDeg = -180.0 + (360.0 * i) / numPoints;
    const diffRad = ((lambdaDeg - lonSunDeg) * Math.PI) / 180.0;

    // Terminator condition: sin(lat)*sin(delta) + cos(lat)*cos(delta)*cos(diff) = 0
    // tan(lat) = -cos(diff) / tan(delta)
    let latDeg: number;
    if (Math.abs(Math.tan(deltaRad)) < 1e-4) {
      latDeg = 0;
    } else {
      const tanLat = -Math.cos(diffRad) / Math.tan(deltaRad);
      latDeg = (Math.atan(tanLat) * 180.0) / Math.PI;
    }

    points.push([lambdaDeg, latDeg]);
  }

  return points;
}

/**
 * Computes Topocentric (Azimuth, Elevation, Range, Doppler Shift) for an observer ground station
 */
export function computeTopocentricPassPoint(
  sat: SatelliteTleRecord,
  targetDate: Date,
  obs: GroundStation,
  nominalFrequencyHz: number = 145800000 // Default 145.800 MHz (ISS VHF Downlink)
): GroundStationPassPoint {
  const satPos = propagateSatellite(sat, targetDate);

  // Convert observer to ECEF
  const obsLatRad = (obs.latitudeDeg * Math.PI) / 180.0;
  const obsLonRad = (obs.longitudeDeg * Math.PI) / 180.0;
  const sinLat = Math.sin(obsLatRad);
  const cosLat = Math.cos(obsLatRad);
  const sinLon = Math.sin(obsLonRad);
  const cosLon = Math.cos(obsLonRad);

  const nCurv = RE_EARTH / Math.sqrt(1.0 - WGS84_E2 * sinLat * sinLat);
  const hKm = obs.altitudeM / 1000.0;

  const obsX = (nCurv + hKm) * cosLat * cosLon;
  const obsY = (nCurv + hKm) * cosLat * sinLon;
  const obsZ = (nCurv * (1.0 - WGS84_E2) + hKm) * sinLat;

  // Convert satellite position to ECEF
  const gmst = getGmstRad(targetDate);
  const satEcefX = satPos.eciX * Math.cos(gmst) + satPos.eciY * Math.sin(gmst);
  const satEcefY = -satPos.eciX * Math.sin(gmst) + satPos.eciY * Math.cos(gmst);
  const satEcefZ = satPos.eciZ;

  // Relative range vector in ECEF
  const dx = satEcefX - obsX;
  const dy = satEcefY - obsY;
  const dz = satEcefZ - obsZ;
  const rangeKm = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Rotate to Topocentric SEZ (South, East, Zenith) frame
  const south = sinLat * cosLon * dx + sinLat * sinLon * dy - cosLat * dz;
  const east = -sinLon * dx + cosLon * dy;
  const zenith = cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz;

  const elevationRad = Math.asin(zenith / Math.max(1e-6, rangeKm));
  let azimuthRad = Math.atan2(east, -south);
  if (azimuthRad < 0) azimuthRad += 2 * Math.PI;

  const elDeg = (elevationRad * 180.0) / Math.PI;
  const azDeg = (azimuthRad * 180.0) / Math.PI;

  // Relative range rate for Doppler shift: numerical differentiation over dt = 1.0 s
  const datePlus = new Date(targetDate.getTime() + 1000);
  const satPosPlus = propagateSatellite(sat, datePlus);
  const gmstPlus = getGmstRad(datePlus);
  const satPlusX = satPosPlus.eciX * Math.cos(gmstPlus) + satPosPlus.eciY * Math.sin(gmstPlus);
  const satPlusY = -satPosPlus.eciX * Math.sin(gmstPlus) + satPosPlus.eciY * Math.cos(gmstPlus);
  const satPlusZ = satPosPlus.eciZ;

  const rangeKmPlus = Math.sqrt(
    Math.pow(satPlusX - obsX, 2) + Math.pow(satPlusY - obsY, 2) + Math.pow(satPlusZ - obsZ, 2)
  );
  const rangeRateKmS = rangeKmPlus - rangeKm;

  // Doppler frequency shift: Delta f = -f0 * (dr/dt) / c
  const dopplerShiftHz = -nominalFrequencyHz * (rangeRateKmS / C_LIGHT);

  return {
    timeSec: Math.floor(targetDate.getTime() / 1000),
    timestamp: targetDate.toTimeString().split(' ')[0],
    azimuthDeg: parseFloat(azDeg.toFixed(1)),
    elevationDeg: parseFloat(elDeg.toFixed(1)),
    rangeKm: parseFloat(rangeKm.toFixed(1)),
    rangeRateKmS: parseFloat(rangeRateKmS.toFixed(3)),
    dopplerShiftHz: parseFloat(dopplerShiftHz.toFixed(1)),
    isAboveHorizon: elDeg > 0.0,
  };
}

/**
 * Scans ahead to find the next satellite passes over the ground station
 */
export function predictUpcomingPasses(
  sat: SatelliteTleRecord,
  startDate: Date,
  obs: GroundStation,
  lookaheadHours: number = 24
): PassSummary[] {
  const passes: PassSummary[] = [];
  const stepSec = 20; // 20-second coarse scan
  const totalSteps = Math.floor((lookaheadHours * 3600) / stepSec);

  let inPass = false;
  let aosTime: Date | null = null;
  let maxEl = 0;
  let tcaTime: Date | null = null;

  for (let i = 0; i < totalSteps; i++) {
    const curDate = new Date(startDate.getTime() + i * stepSec * 1000);
    const pt = computeTopocentricPassPoint(sat, curDate, obs);

    if (pt.isAboveHorizon) {
      if (!inPass) {
        inPass = true;
        aosTime = curDate;
        maxEl = pt.elevationDeg;
        tcaTime = curDate;
      } else {
        if (pt.elevationDeg > maxEl) {
          maxEl = pt.elevationDeg;
          tcaTime = curDate;
        }
      }
    } else {
      if (inPass && aosTime && tcaTime) {
        inPass = false;
        const losTime = curDate;
        const durationSec = Math.floor((losTime.getTime() - aosTime.getTime()) / 1000);

        if (maxEl >= 8.0 && durationSec >= 120) {
          // Only significant passes
          passes.push({
            aosTimestamp: aosTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            tcaTimestamp: tcaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            losTimestamp: losTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            maxElevationDeg: parseFloat(maxEl.toFixed(1)),
            durationSec,
            passType: maxEl > 50 ? 'High' : maxEl > 25 ? 'Medium' : 'Low',
          });
        }

        aosTime = null;
        tcaTime = null;
        maxEl = 0;

        if (passes.length >= 5) break; // Return next 5 passes
      }
    }
  }

  return passes;
}

