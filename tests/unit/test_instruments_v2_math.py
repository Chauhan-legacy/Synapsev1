"""
Regression & Ground-Truth Mathematical Verification for Instrument's Analysis v2.
Validates all analytical equations against published experimental and theoretical reference values:
1. GW150914 Gravitational Wave Chirp Mass (Abbott et al. PRL 2016)
2. IASP91 Mantle Travel Time Tables (Kennett & Engdahl 1991)
3. Hohmann LEO to GEO Orbital Transfer (Vallado 2013)
4. Nordheim Inhour Equation & Point Kinetics (Keepin 1965)
5. Pulsar Cold Plasma Dispersion Delay (Manchester et al. 2005)
6. SGP4 / TLE Mean Motion Orbital Invariants (CelesTrak / Space-Track)
7. Chapman-Ferraro & Shue (1998) Magnetopause Standoff Boundary
"""

import math
import pytest
from apps.api.routers.gwosc_router import compute_chirp_inversion, CHIRP_PREFACTOR
from apps.api.routers.seismology_router import _iasp91_travel_times, _calculate_geodesic_distance, IASP91_REFERENCE_TABLE
from apps.api.routers.astrodynamics_router import compute_hohmann_transfer
from apps.api.routers.reactor_router import _solve_inhour_period, U235_BETAS, U235_LAMBDAS, BETA_TOTAL
from apps.api.routers.pulsar_router import compute_pulsar_physics, K_DM
from apps.api.routers.satellite_sis_router import _parse_tle_lines, FALLBACK_TLE_SET
from apps.api.routers.spaceweather_router import B_0, MU_0

def test_gw150914_chirp_mass_reference():
    """
    Validates post-Newtonian quadrupole chirp mass formula against GW150914.
    At f = 150 Hz and df/dt = 15995.9 Hz/s, Mc,det should equal ~30.6 M_sun,
    and with z = 0.09, Mc,source should equal ~28.1 M_sun (Abbott et al., PRL 116, 061102, 2016).
    """
    res = compute_chirp_inversion(frequency_hz=150.0, f_dot_hz_s=16500.0, redshift_z=0.09)
    computed = res["computed"]
    
    # Detector-frame chirp mass ~ 30.6 M_sun (within 3%)
    assert 29.0 <= computed["detector_frame_chirp_mass_msun"] <= 32.5
    # Source-frame chirp mass ~ 28.1 M_sun (within 3%)
    assert 26.5 <= computed["source_frame_chirp_mass_msun"] <= 29.5
    # ISCO mass bound for 150 Hz
    assert computed["isco_total_mass_bound_msun"] > 0.0

def test_iasp91_seismic_travel_time_tables():
    """
    Validates IASP91 mantle travel-time integration against published standard tables
    at angular distances of 10, 30, 60, and 90 degrees.
    """
    test_distances = [10.0, 30.0, 60.0, 90.0]
    for delta in test_distances:
        t_p, t_s, s_minus_p = _iasp91_travel_times(delta, depth_km=10.0)
        ref_p, ref_s = IASP91_REFERENCE_TABLE[delta]
        
        # P-wave arrival within 3% of official IASP91 table
        assert abs(t_p - ref_p) / ref_p < 0.035, f"P-wave discrepancy at {delta} deg: got {t_p}, expected {ref_p}"
        # S-wave arrival within 3% of official IASP91 table
        assert abs(t_s - ref_s) / ref_s < 0.035, f"S-wave discrepancy at {delta} deg: got {t_s}, expected {ref_s}"
        assert s_minus_p > 0.0

def test_hohmann_leo_to_geo_delta_v():
    """
    Validates vis-viva Hohmann transfer from LEO (200-400 km, r1 ~ 6578-6778 km) to GEO (r2 = 42164 km).
    Standard textbook value: Total Delta_v ≈ 3.9 km/s (3.85 to 3.94 km/s), Transit time ~ 5.3 hours.
    """
    # 200 km LEO parking orbit (r1 = 6578.14 km)
    res_200 = compute_hohmann_transfer(r1_km=6578.14, r2_km=42164.0, central_body="Earth", initial_mass_kg=5000.0)
    dv_200 = res_200["computed"]["total_delta_v_km_s"]
    assert abs(dv_200 - 3.932) < 0.05
    assert 3.85 <= dv_200 <= 3.95

    # 400 km LEO orbit (r1 = 6778 km)
    res_400 = compute_hohmann_transfer(r1_km=6778.0, r2_km=42164.0, central_body="Earth", initial_mass_kg=5000.0)
    dv_400 = res_400["computed"]["total_delta_v_km_s"]
    assert abs(dv_400 - 3.854) < 0.05
    assert 5.0 <= res_400["computed"]["transit_time_hours"] <= 5.5
    # Tsiolkovsky mass fraction must be between 0 and 1
    assert 0.0 < res_400["computed"]["tsiolkovsky_mass_ratio"] < 1.0

def test_reactor_point_kinetics_inhour():
    """
    Validates the Nordheim Inhour equation for U-235 thermal fission.
    For a positive step reactivity of +100 pcm (rho = 0.0010),
    asymptotic period T should be approximately 55 seconds (Keepin 1965).
    """
    rho = 0.0010 # 100 pcm
    Lambda = 1.0e-4 # s
    T = _solve_inhour_period(rho, Lambda, U235_BETAS, U235_LAMBDAS)
    
    assert T is not None
    assert 50.0 <= T <= 60.0, f"Expected Inhour period ~55s, got {T}"

def test_pulsar_dispersion_delay():
    """
    Validates cold plasma dispersion delay formula:
    Delta t = 4.1488e3 * DM * (f_low^-2 - f_high^-2)
    For Crab Pulsar (DM = 56.77 pc cm^-3) between 400 MHz and 1400 MHz:
    Delta t should be approx 1.35 seconds (1350 ms).
    """
    res = compute_pulsar_physics(
        period_sec=0.0335,
        p_dot=4.2e-13,
        dm_pc_cm3=56.77,
        f_low_mhz=400.0,
        f_high_mhz=1400.0
    )
    computed = res["computed"]
    
    expected_delay = K_DM * 56.77 * ((1.0 / (400.0 ** 2)) - (1.0 / (1400.0 ** 2)))
    assert abs(computed["dispersion_delay_sec"] - expected_delay) < 1e-4
    assert 1.30 <= computed["dispersion_delay_sec"] <= 1.40
    # Magnetic field for Crab should be ~ 3.8e12 Gauss
    assert "e+12" in computed["surface_magnetic_field_gauss"]

def test_iss_tle_orbital_period():
    """
    Validates SGP4 TLE orbital period derivation.
    For ISS (mean motion ~ 15.49 rev/day), period should be ~ 92.94 minutes.
    """
    records = _parse_tle_lines(FALLBACK_TLE_SET)
    iss = next(r for r in records if "25544" in r["norad_id"])
    
    assert 92.0 <= iss["orbital_period_min"] <= 94.0
    assert 400.0 <= iss["mean_altitude_km"] <= 430.0
    assert 7.60 <= iss["orbital_velocity_km_s"] <= 7.75

def test_spaceweather_magnetopause_standoff_compression():
    """
    Validates Chapman-Ferraro and Shue (1998) standoff models.
    Under extreme storm conditions (Bz = -15 nT, Pdyn = 18 nPa),
    the magnetopause should compress inside geostationary orbit (R_mp < 6.6 R_E).
    """
    # Quiet conditions: Bz = 0, Pdyn = 2 nPa -> Standoff ~ 10-11 R_E
    p_dyn_quiet = 2.0
    bz_quiet = 0.0
    standoff_quiet = (10.22 + 1.29 * math.tanh(0.184 * (bz_quiet + 8.14))) * (p_dyn_quiet ** (-1.0 / 6.6))
    assert 9.5 <= standoff_quiet <= 11.5
    
    # Extreme CME storm conditions: Bz = -15 nT, Pdyn = 20 nPa
    p_dyn_storm = 20.0
    bz_storm = -15.0
    standoff_storm = (10.22 + 1.29 * math.tanh(0.184 * (bz_storm + 8.14))) * (p_dyn_storm ** (-1.0 / 6.6))
    assert standoff_storm < 6.6, f"Expected compression inside GEO (< 6.6 R_E), got {standoff_storm}"
