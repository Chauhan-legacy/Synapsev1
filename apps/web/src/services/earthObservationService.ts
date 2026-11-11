/**
 * Earth & Space Observation Telemetry Service for SYNAPSE v2.
 * Provides rigorous analytical models and synthetic physical telemetry for:
 * 1. Dual-Frequency GNSS Ionospheric TEC & S4 Scintillation
 * 2. Spacecraft Attitude Quaternion Dynamics & RWA Micro-Vibrations
 * 3. Spaceborne InSAR Phase Interferogram & Coherence
 * 4. Tri-Axial Broadband Seismology Hodogram & Flinn Polarization
 * 5. Geomagnetic ULF & Global Schumann Resonance Cavity
 * 6. Atmospheric Microbarograph Infrasound & Array Slowness Beamforming
 * 7. Satellite Altimetry Oceanic Solitary Wave (ISW) Soliton Profiler (KdV)
 * 8. GRACE / GRACE-FO Tandem Satellite K-Band Ranging Gravity Recovery
 */

// 1. Dual-Frequency GNSS Ionospheric TEC & S4 Scintillation
export interface GnssTecData {
  timeSec: number[];
  slantTecUnits: number[]; // TECU (10^16 e-/m^2)
  verticalTecUnits: number[];
  phaseDispersionRad: number[];
  intensityRatio: number[];
  s4Index: number;
  elevationDeg: number[];
  ippLatDeg: number[];
  ippLonDeg: number[];
  scintillationLevel: 'Quiet' | 'Moderate' | 'Severe';
}

export function getGnssTecData(): GnssTecData {
  const N = 400;
  const timeSec: number[] = [];
  const slantTecUnits: number[] = [];
  const verticalTecUnits: number[] = [];
  const phaseDispersionRad: number[] = [];
  const intensityRatio: number[] = [];
  const elevationDeg: number[] = [];
  const ippLatDeg: number[] = [];
  const ippLonDeg: number[] = [];

  const baseTec = 28.5; // Background equatorial daytime TECU
  const centerT = 200;

  for (let i = 0; i < N; i++) {
    const t = i * 0.5; // 0 to 200 seconds
    timeSec.push(t);

    // Diurnal elevation angle profile (satellite pass from 25 to 78 degrees)
    const el = 25.0 + 53.0 * Math.sin((Math.PI * i) / N);
    elevationDeg.push(parseFloat(el.toFixed(2)));

    // Mapping function M(e) = 1 / sqrt(1 - (R / (R+h) * cos(e))^2)
    const Re = 6371.0;
    const h = 350.0;
    const cosEl = Math.cos((el * Math.PI) / 180.0);
    const obliFactor = 1.0 / Math.sqrt(1.0 - Math.pow((Re / (Re + h)) * cosEl, 2));

    // Ionospheric plasma bubble depletion plume (equatorial spread-F anomaly)
    const bubbleDepletion = -8.2 * Math.exp(-Math.pow((i - centerT) / 28.0, 2));
    const turbulence = 0.85 * Math.sin(0.42 * t) * Math.cos(0.19 * t);
    const vTec = baseTec + bubbleDepletion + turbulence;
    const sTec = vTec * obliFactor;

    verticalTecUnits.push(parseFloat(vTec.toFixed(3)));
    slantTecUnits.push(parseFloat(sTec.toFixed(3)));

    // Dual-frequency dispersive phase delay: Delta Phi = 40.3 / c * (1/f1^2 - 1/f2^2) * STEC
    const phaseRad = sTec * 0.124;
    phaseDispersionRad.push(parseFloat(phaseRad.toFixed(3)));

    // Amplitude diffraction pattern
    const diffWave = 1.0 + 0.38 * Math.sin(2.1 * t + 0.5) * Math.exp(-Math.pow((i - centerT) / 35.0, 2));
    const noise = (Math.random() - 0.5) * 0.08;
    intensityRatio.push(parseFloat(Math.max(0.1, diffWave + noise).toFixed(3)));

    // Ionospheric Piercing Point trajectory
    ippLatDeg.push(parseFloat((-12.4 + 0.04 * i).toFixed(3)));
    ippLonDeg.push(parseFloat((-76.8 + 0.03 * i).toFixed(3)));
  }

  // Calculate S4 index
  const meanI = intensityRatio.reduce((a, b) => a + b, 0) / N;
  const meanI2 = intensityRatio.reduce((a, b) => a + b * b, 0) / N;
  const s4 = Math.sqrt(Math.max(0, (meanI2 - meanI * meanI) / (meanI * meanI)));

  return {
    timeSec,
    slantTecUnits,
    verticalTecUnits,
    phaseDispersionRad,
    intensityRatio,
    s4Index: parseFloat(s4.toFixed(3)),
    elevationDeg,
    ippLatDeg,
    ippLonDeg,
    scintillationLevel: s4 > 0.4 ? 'Severe' : s4 > 0.18 ? 'Moderate' : 'Quiet',
  };
}

// 2. Spacecraft Attitude Dynamics & RWA Micro-Vibrations
export interface SpacecraftAttitudeData {
  timeSec: number[];
  quaternions: Array<{ q0: number; q1: number; q2: number; q3: number }>;
  angularRatesDegS: Array<{ wx: number; wy: number; wz: number }>;
  jitterMicroRad: number[];
  orderWaterfall: Array<{ order: number; amplitudeDb: number; harmonic: string }>;
  wheelRpm: number;
  pointingErrorArcsec: number;
}

export function getSpacecraftAttitudeData(): SpacecraftAttitudeData {
  const N = 300;
  const timeSec: number[] = [];
  const quaternions: Array<{ q0: number; q1: number; q2: number; q3: number }> = [];
  const angularRatesDegS: Array<{ wx: number; wy: number; wz: number }> = [];
  const jitterMicroRad: number[] = [];

  const wheelRpm = 3450; // 57.5 Hz fundamental
  const wheelFreq = wheelRpm / 60.0;

  for (let i = 0; i < N; i++) {
    const t = i * 0.02; // 50 Hz sampling, 6 seconds
    timeSec.push(parseFloat(t.toFixed(3)));

    // Slow orbital pitch rate + high-frequency micro-jitter
    const thetaPitch = 0.001 * t; // Orbit-rate pitch tracking
    const q0 = Math.cos(thetaPitch / 2.0);
    const q2 = Math.sin(thetaPitch / 2.0);
    quaternions.push({
      q0: parseFloat(q0.toFixed(5)),
      q1: 0.00012,
      q2: parseFloat(q2.toFixed(5)),
      q3: 0.00008,
    });

    // Angular velocity with reaction wheel imbalance coupling
    const rwaStatic = 0.0028 * Math.sin(2 * Math.PI * wheelFreq * t);
    const rwaDynamic = 0.0015 * Math.sin(2 * Math.PI * (2 * wheelFreq) * t + 0.8);
    const wx = (rwaStatic + (Math.random() - 0.5) * 0.0004) * 57.2958;
    const wy = (0.001 + rwaDynamic + (Math.random() - 0.5) * 0.0004) * 57.2958;
    const wz = (rwaStatic * 0.5 + (Math.random() - 0.5) * 0.0004) * 57.2958;

    angularRatesDegS.push({
      wx: parseFloat(wx.toFixed(5)),
      wy: parseFloat(wy.toFixed(5)),
      wz: parseFloat(wz.toFixed(5)),
    });

    // Optical line of sight jitter in microradians
    const jitter = (Math.abs(rwaStatic) + Math.abs(rwaDynamic)) * 1e6 * 0.45;
    jitterMicroRad.push(parseFloat(jitter.toFixed(2)));
  }

  // Harmonic orders relative to wheel speed Omega
  const orderWaterfall = [
    { order: 0.5, amplitudeDb: -42.5, harmonic: 'Subharmonic Cage Whirl' },
    { order: 1.0, amplitudeDb: -14.2, harmonic: '1X Static Rotor Unbalance' },
    { order: 1.85, amplitudeDb: -36.8, harmonic: 'Bearing Outer Race (BPFO)' },
    { order: 2.0, amplitudeDb: -19.4, harmonic: '2X Dynamic Couple Unbalance' },
    { order: 2.75, amplitudeDb: -38.1, harmonic: 'Bearing Ball Spin (BSF)' },
    { order: 3.0, amplitudeDb: -28.6, harmonic: '3X Motor Pole Cogging' },
    { order: 4.0, amplitudeDb: -34.0, harmonic: '4X Harmonic Disturbance' },
    { order: 5.2, amplitudeDb: -40.2, harmonic: 'Structural Torsion Resonance' },
  ];

  return {
    timeSec,
    quaternions,
    angularRatesDegS,
    jitterMicroRad,
    orderWaterfall,
    wheelRpm,
    pointingErrorArcsec: 0.28,
  };
}

// 3. Spaceborne InSAR Phase Interferogram & Complex Coherence
export interface InSarData {
  rangeKm: number[];
  phaseWrappedRad: number[];
  phaseUnwrappedRad: number[];
  deformationMm: number[];
  coherenceGamma: number[];
  perpendicularBaselineM: number;
  wavelengthCm: number;
  fringeRatePerKm: number;
}

export function getInSarInterferogramData(): InSarData {
  const N = 250;
  const rangeKm: number[] = [];
  const phaseWrappedRad: number[] = [];
  const phaseUnwrappedRad: number[] = [];
  const deformationMm: number[] = [];
  const coherenceGamma: number[] = [];

  const lambda = 5.546; // C-band Sentinel-1 wavelength in cm
  const B_perp = 124.5; // Perpendicular baseline in meters

  for (let i = 0; i < N; i++) {
    const r = i * 0.1; // 0 to 25 km across fault rupture
    rangeKm.push(parseFloat(r.toFixed(2)));

    // Ground tectonic displacement across fault (arctangent slip profile)
    // Co-seismic displacement of 48 mm across fault line at r = 12.5 km
    const slipMm = 24.0 * Math.tanh((r - 12.5) / 2.2);
    deformationMm.push(parseFloat(slipMm.toFixed(2)));

    // Interferometric phase phi = (4 * pi / lambda) * Delta R
    const truePhase = (4.0 * Math.PI * (slipMm / 10.0)) / lambda;
    phaseUnwrappedRad.push(parseFloat(truePhase.toFixed(3)));

    // Wrapped phase in [-pi, +pi]
    let wrapped = truePhase % (2 * Math.PI);
    if (wrapped > Math.PI) wrapped -= 2 * Math.PI;
    if (wrapped < -Math.PI) wrapped += 2 * Math.PI;
    phaseWrappedRad.push(parseFloat(wrapped.toFixed(3)));

    // Spatial coherence gamma: high in urban/bare rock, low near fault shear rupture
    const decorrelation = 0.45 * Math.exp(-Math.pow((r - 12.5) / 1.8, 2));
    const gamma = Math.max(0.12, 0.92 - decorrelation + (Math.random() - 0.5) * 0.05);
    coherenceGamma.push(parseFloat(gamma.toFixed(3)));
  }

  return {
    rangeKm,
    phaseWrappedRad,
    phaseUnwrappedRad,
    deformationMm,
    coherenceGamma,
    perpendicularBaselineM: B_perp,
    wavelengthCm: lambda,
    fringeRatePerKm: 2.1,
  };
}

// 4. Tri-Axial Broadband Seismology Hodogram & Flinn Polarization
export interface SeismologyData {
  timeSec: number[];
  vz: number[]; // Vertical component
  vn: number[]; // North component
  ve: number[]; // East component
  rectilinearityL: number[]; // Flinn rectilinearity
  planarityP: number[]; // Flinn planarity
  backAzimuthDeg: number;
  incidenceAngleDeg: number;
  pWaveArrivalSec: number;
  sWaveArrivalSec: number;
}

export function getTriaxialSeismologyData(): SeismologyData {
  const N = 400;
  const fs = 50.0;
  const timeSec: number[] = [];
  const vz: number[] = [];
  const vn: number[] = [];
  const ve: number[] = [];
  const rectilinearityL: number[] = [];
  const planarityP: number[] = [];

  const pArrival = 2.4; // seconds
  const sArrival = 5.2; // seconds
  const backAzimuth = 42.0; // degrees from North
  const incAngle = 28.0; // degrees from Vertical

  const thetaRad = (backAzimuth * Math.PI) / 180.0;
  const incRad = (incAngle * Math.PI) / 180.0;

  for (let i = 0; i < N; i++) {
    const t = i / fs;
    timeSec.push(parseFloat(t.toFixed(3)));

    let sigP = 0;
    let sigS = 0;

    // P-Wave Arrival (Longitudinal compression wave along ray path)
    if (t >= pArrival && t < pArrival + 2.5) {
      const dtP = t - pArrival;
      const env = Math.exp(-1.8 * dtP);
      sigP = 4.2 * Math.sin(2 * Math.PI * 4.5 * dtP) * env;
    }

    // S-Wave Arrival (Transverse shear wave perpendicular to ray path)
    if (t >= sArrival && t < sArrival + 3.0) {
      const dtS = t - sArrival;
      const env = Math.exp(-1.2 * dtS);
      sigS = 9.8 * Math.sin(2 * Math.PI * 2.1 * dtS + 0.4) * env;
    }

    // Directional projections
    const noiseZ = (Math.random() - 0.5) * 0.15;
    const noiseN = (Math.random() - 0.5) * 0.15;
    const noiseE = (Math.random() - 0.5) * 0.15;

    const z = sigP * Math.cos(incRad) + sigS * Math.sin(incRad) * 0.2 + noiseZ;
    const n = sigP * Math.sin(incRad) * Math.cos(thetaRad) + sigS * Math.cos(thetaRad + Math.PI / 2) + noiseN;
    const e = sigP * Math.sin(incRad) * Math.sin(thetaRad) + sigS * Math.sin(thetaRad + Math.PI / 2) + noiseE;

    vz.push(parseFloat(z.toFixed(4)));
    vn.push(parseFloat(n.toFixed(4)));
    ve.push(parseFloat(e.toFixed(4)));

    // Polarization Metrics
    if (t >= pArrival && t < sArrival) {
      rectilinearityL.push(parseFloat((0.92 + (Math.random() - 0.5) * 0.04).toFixed(3)));
      planarityP.push(parseFloat((0.15 + (Math.random() - 0.5) * 0.04).toFixed(3)));
    } else if (t >= sArrival) {
      rectilinearityL.push(parseFloat((0.45 + (Math.random() - 0.5) * 0.06).toFixed(3)));
      planarityP.push(parseFloat((0.88 + (Math.random() - 0.5) * 0.04).toFixed(3)));
    } else {
      rectilinearityL.push(parseFloat((0.18 + (Math.random() - 0.5) * 0.05).toFixed(3)));
      planarityP.push(parseFloat((0.21 + (Math.random() - 0.5) * 0.05).toFixed(3)));
    }
  }

  return {
    timeSec,
    vz,
    vn,
    ve,
    rectilinearityL,
    planarityP,
    backAzimuthDeg: backAzimuth,
    incidenceAngleDeg: incAngle,
    pWaveArrivalSec: pArrival,
    sWaveArrivalSec: sArrival,
  };
}

// 5. Geomagnetic ULF & Global Schumann Resonance Cavity
export interface SchumannResonanceData {
  frequencyHz: number[];
  magneticPsdPt2Hz: number[];
  lorentzianFit: number[];
  modes: Array<{ n: number; centerFreqHz: number; qFactor: number; amplitudePt: number }>;
  skinDepthMeters: number[];
  apparentResistivityOhmM: number[];
}

export function getSchumannResonanceData(): SchumannResonanceData {
  const N = 300;
  const frequencyHz: number[] = [];
  const magneticPsdPt2Hz: number[] = [];
  const lorentzianFit: number[] = [];
  const skinDepthMeters: number[] = [];
  const apparentResistivityOhmM: number[] = [];

  const resonantModes = [
    { n: 1, centerFreqHz: 7.83, qFactor: 4.8, amplitudePt: 1.25 },
    { n: 2, centerFreqHz: 14.3, qFactor: 5.6, amplitudePt: 0.88 },
    { n: 3, centerFreqHz: 20.8, qFactor: 6.2, amplitudePt: 0.62 },
    { n: 4, centerFreqHz: 27.3, qFactor: 6.8, amplitudePt: 0.44 },
    { n: 5, centerFreqHz: 33.8, qFactor: 7.1, amplitudePt: 0.31 },
  ];

  for (let i = 0; i < N; i++) {
    const f = 1.0 + (40.0 * i) / N; // 1 to 41 Hz
    frequencyHz.push(parseFloat(f.toFixed(2)));

    // 1/f background red magnetic noise
    let background = 0.15 / Math.pow(f, 0.6);

    // Sum of Lorentzian resonance peaks: L(f) = A / (1 + 4*Q^2*((f - f0)/f0)^2)
    let lorentz = background;
    for (const m of resonantModes) {
      const delta = (f - m.centerFreqHz) / m.centerFreqHz;
      lorentz += m.amplitudePt / (1.0 + 4.0 * Math.pow(m.qFactor * delta, 2));
    }
    lorentzianFit.push(parseFloat(lorentz.toFixed(4)));

    const noise = (Math.random() - 0.5) * 0.04;
    magneticPsdPt2Hz.push(parseFloat(Math.max(0.01, lorentz + noise).toFixed(4)));

    // Magnetotelluric apparent resistivity and skin depth
    const rho = 120.0 + 80.0 * Math.log10(f); // Crustal resistivity ~ 150 Ohm-m
    apparentResistivityOhmM.push(parseFloat(rho.toFixed(1)));
    const skin = 503.0 * Math.sqrt(rho / f);
    skinDepthMeters.push(parseFloat(skin.toFixed(1)));
  }

  return {
    frequencyHz,
    magneticPsdPt2Hz,
    lorentzianFit,
    modes: resonantModes,
    skinDepthMeters,
    apparentResistivityOhmM,
  };
}

// 6. Atmospheric Microbarograph Infrasound & Array Slowness Beamformer
export interface InfrasoundData {
  timeSec: number[];
  pressureHpa: number[];
  apparentVelocityMS: number;
  backAzimuthDeg: number;
  correlationCoeff: number;
  slownessGrid: Array<{ sx: number; sy: number; power: number }>;
}

export function getInfrasoundBeamformData(): InfrasoundData {
  const N = 250;
  const timeSec: number[] = [];
  const pressureHpa: number[] = [];

  const backAzimuth = 138.5; // Back-azimuth from SE volcanic explosion
  const traceVelocity = 348.0; // m/s stratospheric acoustic duct speed

  for (let i = 0; i < N; i++) {
    const t = i * 0.1; // 25 seconds
    timeSec.push(parseFloat(t.toFixed(2)));

    // Infrasound N-wave shock from volcanic caldera burst
    let p = 0;
    if (t >= 8.0 && t <= 16.0) {
      const dt = t - 12.0;
      p = -1.8 * dt * Math.exp(-Math.pow(dt / 2.2, 2)) + 0.4 * Math.sin(2 * Math.PI * 1.8 * dt);
    }
    p += (Math.random() - 0.5) * 0.12; // Atmospheric wind noise
    pressureHpa.push(parseFloat(p.toFixed(3)));
  }

  // 2D Slowness grid sx, sy in s/km
  const slownessGrid: Array<{ sx: number; sy: number; power: number }> = [];
  const peakSx = (Math.sin((backAzimuth * Math.PI) / 180.0) / traceVelocity) * 1000.0;
  const peakSy = (Math.cos((backAzimuth * Math.PI) / 180.0) / traceVelocity) * 1000.0;

  for (let ix = -10; ix <= 10; ix += 2) {
    for (let iy = -10; iy <= 10; iy += 2) {
      const sx = ix * 0.35;
      const sy = iy * 0.35;
      const dist = Math.sqrt(Math.pow(sx - peakSx, 2) + Math.pow(sy - peakSy, 2));
      const power = Math.exp(-Math.pow(dist / 0.85, 2));
      slownessGrid.push({
        sx: parseFloat(sx.toFixed(2)),
        sy: parseFloat(sy.toFixed(2)),
        power: parseFloat(power.toFixed(3)),
      });
    }
  }

  return {
    timeSec,
    pressureHpa,
    apparentVelocityMS: traceVelocity,
    backAzimuthDeg: backAzimuth,
    correlationCoeff: 0.945,
    slownessGrid,
  };
}

// 7. Satellite Altimetry Oceanic Solitary Wave (ISW) Soliton Profiler (KdV)
export interface OceanSolitonData {
  distanceKm: number[];
  seaSurfaceHeightCm: number[];
  pycnoclineDepressionM: number[];
  radarBackscatterDb: number[];
  solitonAmplitudeM: number;
  solitonPhaseSpeedMs: number;
  characteristicWidthM: number;
}

export function getOceanSolitonData(): OceanSolitonData {
  const N = 240;
  const distanceKm: number[] = [];
  const seaSurfaceHeightCm: number[] = [];
  const pycnoclineDepressionM: number[] = [];
  const radarBackscatterDb: number[] = [];

  const eta0 = 65.0; // 65-meter internal soliton depression
  const L = 380.0; // 380-meter characteristic spatial half-width
  const c0 = 1.95; // 1.95 m/s phase speed
  const centerKm = 12.0;

  for (let i = 0; i < N; i++) {
    const xKm = i * 0.1; // 0 to 24 km track
    distanceKm.push(parseFloat(xKm.toFixed(2)));

    const xM = (xKm - centerKm) * 1000.0;

    // KdV Soliton Solution: eta(x) = -eta0 * sech^2(x / L)
    const sech = 1.0 / Math.cosh(xM / L);
    const depression = -eta0 * (sech * sech);
    pycnoclineDepressionM.push(parseFloat(depression.toFixed(2)));

    // Induced Sea Surface Height (SSH) anomaly (~15 cm displacement)
    const ssh = 14.5 * (sech * sech) + (Math.random() - 0.5) * 1.2;
    seaSurfaceHeightCm.push(parseFloat(ssh.toFixed(2)));

    // Radar backscatter cross-section sigma_0 modulated by surface wave convergence/divergence
    const dEta_dx = (2.0 * eta0 / L) * (sech * sech) * Math.tanh(xM / L);
    const sigma0 = 11.5 + 4.2 * dEta_dx * 10.0 + (Math.random() - 0.5) * 0.4;
    radarBackscatterDb.push(parseFloat(sigma0.toFixed(2)));
  }

  return {
    distanceKm,
    seaSurfaceHeightCm,
    pycnoclineDepressionM,
    radarBackscatterDb,
    solitonAmplitudeM: eta0,
    solitonPhaseSpeedMs: c0,
    characteristicWidthM: L,
  };
}

// 8. GRACE / GRACE-FO Tandem Satellite K-Band Ranging Gravity Recovery
export interface GraceGravityData {
  orbitTimeSec: number[];
  interSatelliteRangeM: number[];
  rangeRateResidualUmS: number[];
  gravityAccelerationUgal: number[];
  degreeVarianceSpectrum: Array<{ degree: number; geoidPowerMm: number; hydrologySignalMm: number }>;
  equivalentWaterThicknessCm: number;
}

export function getGraceGravityRecoveryData(): GraceGravityData {
  const N = 300;
  const orbitTimeSec: number[] = [];
  const interSatelliteRangeM: number[] = [];
  const rangeRateResidualUmS: number[] = [];
  const gravityAccelerationUgal: number[] = [];

  const nominalRange = 220000.0; // 220 km separation between GRACE twins
  const anomalyCenter = 150;

  for (let i = 0; i < N; i++) {
    const t = i * 1.0; // 1 second intervals, 300 s orbital pass
    orbitTimeSec.push(t);

    // Gravity anomaly signature: lead satellite accelerates first, then trailing satellite
    // Produces a classic anti-symmetric range-rate dipole
    const dt = (i - anomalyCenter) / 16.0;
    const accelDipole = -18.5 * dt * Math.exp(-Math.pow(dt, 2));
    const noise = (Math.random() - 0.5) * 0.35;

    const rateUmS = accelDipole + noise;
    rangeRateResidualUmS.push(parseFloat(rateUmS.toFixed(3)));

    const range = nominalRange + 0.0012 * Math.sin(0.01 * t);
    interSatelliteRangeM.push(parseFloat(range.toFixed(4)));

    // Inferred gravity acceleration anomaly in microGals (1 uGal = 10^-8 m/s^2)
    const uGal = 45.0 * Math.exp(-Math.pow(dt, 2)) + (Math.random() - 0.5) * 2.0;
    gravityAccelerationUgal.push(parseFloat(uGal.toFixed(2)));
  }

  // Spherical harmonic degree variance spectrum (Kaula rule of thumb vs GRACE sensitivity)
  const degreeVarianceSpectrum: Array<{ degree: number; geoidPowerMm: number; hydrologySignalMm: number }> = [];
  for (let l = 2; l <= 60; l += 2) {
    const kaula = (10.0 / (l * l)) * 1000.0;
    const signal = (8.5 / Math.pow(l, 1.4)) * 1000.0;
    degreeVarianceSpectrum.push({
      degree: l,
      geoidPowerMm: parseFloat(kaula.toFixed(2)),
      hydrologySignalMm: parseFloat(signal.toFixed(2)),
    });
  }

  return {
    orbitTimeSec,
    interSatelliteRangeM,
    rangeRateResidualUmS,
    gravityAccelerationUgal,
    degreeVarianceSpectrum,
    equivalentWaterThicknessCm: -14.2, // Groundwater depletion anomaly in cm
  };
}

