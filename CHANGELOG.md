# SYNAPSE Engineering Changelog

## [Astronomy & Cosmic Physical Telemetry Suite] - 2026-11-10

### Full Instrument Rack: 20 Mega Instruments & Astronomy Category
- **Astronomy Suite Integration:**
  - Added dedicated **`Astronomy`** filter category and 1-click **`🔭 Astronomy`** preset to `InstrumentRackView.tsx`.
  - Expanded instrument rack from 16 to **20 analytical instruments**.
  - **LIGO GW150914 Spacetime Strain Streamer (`ligo_gw_strain`)**:
    - Real gravitational-wave strain $h(t) \times 10^{-21}$ modeling binary black hole inspiral, merger event ($t = 0\text{ s}$), and ringdown.
    - KaTeX mathematical basis: $h(t) = \frac{4}{r}\left(\frac{G\mathcal{M}}{c^2}\right)^{5/4}\left(\frac{c(t_c - t)}{5}\right)^{-1/4}\cos(2\phi(t))$.
  - **Kepler/TESS Exoplanet Transit Photometer (`kepler_transit`)**:
    - Normalized stellar flux transit light-curve with quadratic limb-darkening and BLS transit depth inversion ($\Delta F = 1.42\%$, $R_p = 1.17\,R_\oplus$).
    - KaTeX mathematical basis: $\Delta F \approx \left(\frac{R_p}{R_*}\right)^2$.
  - **NOAA GOES Solar X-Ray Spectrograph (`goes_solar_flare`)**:
    - 1-minute solar irradiance telemetry with M5.4 class eruption classification and derivative rate-of-rise alert.
    - KaTeX mathematical basis: $I_{\text{GOES}} = \int_{0.1\,\text{nm}}^{0.8\,\text{nm}} F(\lambda, t)\,d\lambda$.
  - **Pulsar Epoch-Folding Profiler (`pulsar_folding`)**:
    - Integrated radio pulse profile over rotational phase $[0, 1]$ showing primary main pulse and secondary interpulse for Crab Pulsar (PSR B0531+21, $P = 33.5\text{ ms}$, $\text{DM} = 56.8\,\text{pc/cm}^3$).
    - KaTeX mathematical basis: $\Phi(t) = \frac{t - t_0}{P} - \frac{1}{2}\frac{\dot{P}}{P^2}(t - t_0)^2 \pmod 1$.
- **Backend & Service Integration:**
  - Implemented `apps/api/routers/astronomy_router.py` connecting to GWOSC, NASA Exoplanet Archive, NOAA SWPC, and ATNF.
  - Implemented `apps/web/src/services/astronomyService.ts` with high-fidelity analytical fallback.
  - Added 4 authentic Astronomy signal presets to the top bar dataset selector in `SignalContext.tsx`.

## [Top Bar & Dataset Management Enhancement] - 2026-11-10

### User-Requested Enhancement: Top Bar Dataset Delete Button
- **Top Bar Integration:**
  - Added dedicated `[Trash2] Delete` button immediately adjacent to the dataset selector dropdown in `apps/web/src/components/shell/TopBar.tsx`.
  - Removed restrictive `activeIsCustom` guard, making the delete action accessible for all datasets (benchmarks and custom uploaded datasets).
  - Clean Paper Teal styling: Ink text `#C0392B`, border `#DDD6C7`, hover red tint `#FDEDEC`, accessible title and `aria-label`.
- **State Management & Persistence:**
  - Updated `SignalContext.tsx` to maintain `deletedDatasetIds` in state with `localStorage` persistence under `synapse_deleted_datasets_v1`.
  - When the currently active dataset is deleted, `activeSignal` seamlessly transitions to the next available dataset.
  - Added `restoreDefaultDatasets()` function so presets can be restored at any time.
  - Mirrored all improvements directly to `Synapsev2`.

## [Stage 1 - Foundation & Design Token Architecture] - 2026-11-10

### Security & Safety
- **Git Safety Tag:** Tagged repository at `pre-upgrade`.
- **Sibling Safety Backup:** Cloned full codebase to `C:\Users\Priyansh\Desktop\Synapse_backup_original` (excluding `node_modules`, `dist`, and cache).

### Design Token Architecture (Section D - Root Cause Fix)
- **Central Token Source:** Created `apps/web/src/styles/tokens.css` with CSS custom properties matching the official specification:
  - Surfaces: Page background `#F6F3EC`, Panel background `#FFFFFF`, Tint `#EFEBE0`, Border `#DDD6C7`.
  - Typography: Ink Black `#1F2430`, Secondary `#4A5060`, Muted `#6B6F7B`.
  - Accent: Deep Teal `#0F766E` (hover `#0B5E58`, subtle `#E6F4F2`).
  - Sage/Cream: Sage `#8FAE8B`, Cream `#F7F0D6`.
  - Semantic Status: Success `#2E7D32`, Warning `#B7791F`, Error `#C0392B`, Info `#1D6FA5`.
  - Chart Series (Strict Colorblind-Safe Order):
    1. Blue `#0072B2`
    2. Orange `#E69F00`
    3. Green `#009E73`
    4. Vermilion `#D55E00`
    5. Purple `#7B5EA7`
    6. Sky `#56B4E9`
    7. Pink `#CC79A7`
    8. Gold `#B8960C`
- **Tailwind Mapping:** Bound all theme utilities in `apps/web/tailwind.config.js` directly to CSS token variables.
- **Root Cause Fix for Color Inconsistency:** Eliminated dark mode stylesheets (`.theme-dark`, `.theme-high-contrast`, OS dark preference listener overrides, and `dark:` tailwind variants) to lock the app into the single, professional, high-contrast Paper Teal visual palette (WCAG AA compliant).
- **Chart Palette Alignment:** Standardized `InteractiveChart.tsx` to default single traces to ink black `#1F2430` and multichannel traces to the 8-color series tokens.

### Full Instrument Rack Prototype (Section A)
- **Component Created:** `apps/web/src/views/InstrumentRackView.tsx` with 6 core instruments:
  1. Time-Domain Oscillogram (Synchronous linked cursor)
  2. Welch Discrete Fourier Power Spectrum
  3. Takens Delay Phase Space Embedding & Poincaré Map
  4. Higher-Order Bispectrum & Bicoherence ($b^2(5, 14) = 0.884$)
  5. Hilbert Analytic Signal & Instantaneous Amplitude Envelope
  6. Autocorrelation Function with $\pm 1.96/\sqrt{N}$ Bartlett bounds
- **Panel Controls & Interactive Features:**
  - Panel deletion with an 8-second animated undo toast.
  - "Restore panels" dropdown menu and "Clear rack" confirmation modal.
  - Layout presets: Compact (h-48), Comfortable (h-60), Presentation (h-80).
  - Linked hover crosshair synchronized across all time-domain instruments.
  - Category filters and real-time search.
- **Proof Screenshots Captured:**
  - `prototype-screenshots/prototype-rack-desktop.png` (1440x900)
  - `prototype-screenshots/prototype-rack-tablet.png` (768x1024)
  - `prototype-screenshots/prototype-rack-phone.png` (360x800)
  - `prototype-screenshots/prototype-workbench-desktop.png` (1440x900)

