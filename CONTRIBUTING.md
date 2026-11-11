# Contributing to SYNAPSE

Thank you for your interest in contributing to **SYNAPSE**, the open-architecture platform for reproducible time-series intelligence and scientific discovery!

Our mission is to provide students, hobbyists, and researchers with tools whose every number, plot, and label is computed directly from loaded data by validated mathematical analysers, explained in plain language, and backed by verifiable statistical evidence.

---

## 1. Ground Rules & Design Philosophy

1. **Honesty by Construction:**
   - Every metric shown on screen must be computed from the loaded data.
   - Zero hardcoded or typed-in numbers.
   - Every analyser declares its assumptions, tests them, and reports an empirical effect size alongside its $p$-value.
2. **False-Discovery Control:**
   - Pure noise must yield **0 validated discoveries**.
   - Multiple candidate hypotheses must be corrected via Benjamini-Hochberg False Discovery Rate (FDR) control ($q = 0.05$).
3. **Maturity Labeling:**
   - If an algorithm or implementation is still undergoing validation benchmarks, label it honestly as `Experimental` in both UI and code.
4. **Reproducibility:**
   - Analysis results should be deterministic given the same random seed, data, and parameters.
   - Every result carries its computational provenance manifest (SHA-256 fingerprint, parameters, environment).

---

## 2. Development Setup

### Python Backend & Engines
```bash
# Clone the repository
git clone https://github.com/Chauhan-legacy/Synapsev1.git
cd Synapsev1

# Create and activate Python 3.11 virtual environment
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows

# Install in editable mode with development & test dependencies
pip install -e .[test]
pip install pytest pytest-asyncio
```

### React / TypeScript Frontend
```bash
cd apps/web
npm install
npm run dev     # Starts Vite development server at localhost:5173
npm run build   # Type-checks and creates production bundle
```

---

## 3. Running the Test Suites

Before opening a pull request, ensure all tests pass:

```bash
# Run all Python ground-truth & engine tests (49 tests)
pytest -v tests/

# Run the in-browser TypeScript math verification suite (10 benchmarks)
./apps/web/node_modules/.bin/tsc apps/web/src/utils/signalMath.ts --outDir tmp_math --module commonjs --target es2022 --skipLibCheck
node scripts/test_math_benchmarks.js
```

---

## 4. Submitting a Pull Request

1. Create a feature branch: `git checkout -b feat/my-new-analyser` or `fix/my-bug-fix`.
2. Commit with clear, descriptive messages explaining what was changed and why.
3. Include automated tests with planted ground truth in `tests/ground_truth/`.
4. Ensure CI tests pass on your branch.
5. Submit a Pull Request targeting `main`.

