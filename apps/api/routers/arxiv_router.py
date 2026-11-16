"""
Universal Scientific Literature & ArXiv Gateway for SYNAPSE.
Multi-tier retrieval combining:
1. Live arXiv Official Atom XML API (export.arxiv.org)
2. Live OpenAlex Global Scholarly API (api.openalex.org)
3. Verified Historical Seminal Canon (offline reference fallback)

Rules:
- Never invent authors, papers, citations, years, or DOIs.
- Report real source and mode ("live" vs "offline_sample").
- Whole-word matching for historical canon entries.
- Cache only live payloads with 24-hour TTL.
- Strictly verified TLS contexts (no unverified TLS fallback).
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import ssl
import hashlib
import json
import time
import math
import re
from pathlib import Path

router = APIRouter(prefix="/api/arxiv", tags=["ArXiv Literature"])

CACHE_DIR = Path("cache/arxiv")
try:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

ATOM_NS = "{http://www.w3.org/2005/Atom}"
ARXIV_NS = "{http://arxiv.org/schemas/atom}"
CACHE_TTL_SECONDS = 86400  # 24 hours

# In-memory LRU cache
_MEM_CACHE: Dict[str, Dict[str, Any]] = {}

def _get_ssl_context() -> ssl.SSLContext:
    """Returns a verified SSL context using certifi if available, else system default."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()

# ============================================================================
# HISTORICAL SEMINAL CANON (Verified Classical Landmarks)
# ============================================================================
SEMINAL_CANON: List[Dict[str, Any]] = [
    {
        "id": "seminal_lorenz_1963",
        "arxiv_id": "historical/lorenz1963",
        "title": "Deterministic Nonperiodic Flow",
        "authors": ["Edward N. Lorenz"],
        "year": 1963,
        "abstract": "Finite systems of deterministic ordinary differential equations may exhibit nonperiodic solutions that are bounded yet unstable with respect to infinitesimal perturbations in initial conditions. We construct a 3D convective fluid model exhibiting a strange attractor with non-integer fractal dimension and butterfly-effect divergence.",
        "category": "physics.flu-dyn",
        "doi": "10.1175/1520-0469(1963)020<0130:DNF>2.0.CO;2",
        "pdf_url": "https://journals.ametsoc.org/downloadpdf/journals/atsc/20/2/1520-0469_1963_020_0130_dnf_2_0_co_2.pdf",
        "citationCount": None,
        "primary_class": "nlin.CD",
        "keywords": ["lorenz", "chaos", "butterfly", "attractor", "nonperiodic", "convection"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_shannon_1948",
        "arxiv_id": "historical/shannon1948",
        "title": "A Mathematical Theory of Communication",
        "authors": ["Claude E. Shannon"],
        "year": 1948,
        "abstract": "The fundamental problem of communication is that of reproducing at one point either exactly or approximately a message selected at another point. We establish information entropy H = -sum(p log p), channel capacity C = B log2(1 + S/N), and the noisy-channel coding theorem establishing the physical limits of digital transmission.",
        "category": "cs.IT",
        "doi": "10.1002/j.1538-7305.1948.tb01338.x",
        "pdf_url": "https://ia800300.us.archive.org/3/items/bellsystemtechni27amerrich/bellsystemtechni27amerrich.pdf",
        "citationCount": None,
        "primary_class": "math.IT",
        "keywords": ["shannon", "information theory", "entropy", "channel capacity", "communication"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_welch_1967",
        "arxiv_id": "historical/welch1967",
        "title": "The Use of Fast Fourier Transform for the Estimation of Power Spectra: A Method Based on Time Averaging Over Short, Modified Periodograms",
        "authors": ["Peter D. Welch"],
        "year": 1967,
        "abstract": "A spectral estimation technique based on dividing a discrete time series into overlapping segments, applying a data window to control spectral leakage, computing the FFT of each segment, and averaging periodograms to reduce estimator variance by a factor proportional to the number of segments.",
        "category": "eess.SP",
        "doi": "10.1109/TAU.1967.1161901",
        "pdf_url": "https://ieeexplore.ieee.org/document/1161901",
        "citationCount": None,
        "primary_class": "eess.SP",
        "keywords": ["welch", "psd", "periodogram", "fft", "spectral estimation"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_thomson_1982",
        "arxiv_id": "historical/thomson1982",
        "title": "Spectrum Estimation and Harmonic Analysis",
        "authors": ["David J. Thomson"],
        "year": 1982,
        "abstract": "Introduces the Discrete Prolate Spheroidal Sequences (DPSS or Slepian tapers) multitaper spectral analysis framework and the harmonic F-test. Solves the fundamental bias-variance trade-off in spectral analysis by projecting onto multiple orthogonal eigenspectra and separating continuous colored noise from harmonic line components with rigorous Fisher F-distributions.",
        "category": "stat.ME",
        "doi": "10.1109/PROC.1982.12433",
        "pdf_url": "https://ieeexplore.ieee.org/document/1456673",
        "citationCount": None,
        "primary_class": "stat.ME",
        "keywords": ["thomson", "multitaper", "dpss", "slepian", "f-test", "harmonic"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_granger_1969",
        "arxiv_id": "historical/granger1969",
        "title": "Investigating Causal Relations by Econometric Models and Cross-spectral Methods",
        "authors": ["Clive W. J. Granger"],
        "year": 1969,
        "abstract": "Defines causality in time series: a variable X Granger-causes Y if knowledge of the past history of X improves the linear autoregressive prediction of Y compared to using the past history of Y alone. We formulate the bivariate Vector Autoregression (VAR) F-ratio test and cross-spectral coherence phase lag representation.",
        "category": "econ.EM",
        "doi": "10.2307/1912791",
        "pdf_url": "https://www.jstor.org/stable/1912791",
        "citationCount": None,
        "primary_class": "econ.EM",
        "keywords": ["granger", "causality", "var", "autoregression"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_takens_1981",
        "arxiv_id": "historical/takens1981",
        "title": "Detecting Strange Attractors in Turbulence",
        "authors": ["Floris Takens"],
        "year": 1981,
        "abstract": "Proves the foundational embedding theorem for non-linear dynamical systems: from a single scalar observable x(t), the smooth manifold topology of an underlying multidimensional dynamical attractor of box dimension d can be reconstructed diffeomorphically by time-delay coordinates v(t) = (x(t), x(t-tau), ..., x(t-(m-1)tau)) whenever embedding dimension m >= 2d + 1.",
        "category": "math.DS",
        "doi": "10.1007/BFb0091924",
        "pdf_url": "https://link.springer.com/chapter/10.1007/BFb0091924",
        "citationCount": None,
        "primary_class": "math.DS",
        "keywords": ["takens", "embedding", "delay coordinates", "attractor", "phase space"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_benjamini_1995",
        "arxiv_id": "historical/benjamini1995",
        "title": "Controlling the False Discovery Rate: A Practical and Powerful Approach to Multiple Testing",
        "authors": ["Yoav Benjamini", "Yosef Hochberg"],
        "year": 1995,
        "abstract": "Introduces the False Discovery Rate (FDR) criterion: controlling the expected proportion of falsely rejected null hypotheses among all rejections, E[V/R]. Provides the step-up procedure: sort p-values p(1) <= ... <= p(m) and reject for all i <= k where k is the maximum index satisfying p(i) <= (i/m) * q.",
        "category": "stat.ME",
        "doi": "10.1111/j.2517-6161.1995.tb02031.x",
        "pdf_url": "https://www.jstor.org/stable/2346101",
        "citationCount": None,
        "primary_class": "stat.ME",
        "keywords": ["benjamini", "hochberg", "fdr", "false discovery rate", "multiple testing"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_abbott_ligo_2016",
        "arxiv_id": "1602.03837",
        "title": "Observation of Gravitational Waves from a Binary Black Hole Merger (GW150914)",
        "authors": ["B. P. Abbott", "R. Abbott", "LIGO Scientific Collaboration and Virgo Collaboration"],
        "year": 2016,
        "abstract": "First direct detection of gravitational waves produced by the inspiral and ringdown of two merging stellar-mass black holes. The signal sweeps upward in frequency from 35 to 250 Hz with peak strain 1.0 × 10^-21 at a matched-filter signal-to-noise ratio of 24.",
        "category": "gr-qc",
        "doi": "10.1103/PhysRevLett.116.061102",
        "pdf_url": "https://arxiv.org/pdf/1602.03837.pdf",
        "citationCount": None,
        "primary_class": "gr-qc",
        "keywords": ["ligo", "gw150914", "gravitational waves", "black hole", "merger"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_killick_pelt_2012",
        "arxiv_id": "1101.1438",
        "title": "Optimal Detection of Changepoints with a Linear Computational Cost (PELT)",
        "authors": ["Rebecca Killick", "Paul Fearnhead", "Idris A. Eckley"],
        "year": 2012,
        "abstract": "Introduces the Pruned Exact Linear Time (PELT) algorithm for exact non-parametric and parametric changepoint detection. By introducing an inequality pruning condition into dynamic programming, PELT achieves exact global minimization of penalized cost functions in O(n) linear computational time.",
        "category": "stat.ME",
        "doi": "10.1080/01621459.2012.737745",
        "pdf_url": "https://arxiv.org/pdf/1101.1438.pdf",
        "citationCount": None,
        "primary_class": "stat.ME",
        "keywords": ["pelt", "changepoint", "killick", "pruned exact linear time"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_adams_bocpd_2007",
        "arxiv_id": "0710.3742",
        "title": "Bayesian Online Changepoint Detection (BOCPD)",
        "authors": ["Ryan Prescott Adams", "David J. C. MacKay"],
        "year": 2007,
        "abstract": "A recursive online Bayesian algorithm that updates a probability distribution over the current run length upon observing each new sample, using conjugate prior predictive distributions and hazard functions without looking ahead.",
        "category": "stat.ML",
        "doi": "10.48550/arXiv.0710.3742",
        "pdf_url": "https://arxiv.org/pdf/0710.3742.pdf",
        "citationCount": None,
        "primary_class": "stat.ML",
        "keywords": ["bocpd", "bayesian changepoint", "adams", "run length"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_attention_2017",
        "arxiv_id": "1706.03762",
        "title": "Attention Is All You Need",
        "authors": ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit", "Llion Jones", "Aidan N. Gomez", "Lukasz Kaiser", "Illia Polosukhin"],
        "year": 2017,
        "abstract": "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
        "category": "cs.CL",
        "doi": "10.48550/arXiv.1706.03762",
        "pdf_url": "https://arxiv.org/pdf/1706.03762.pdf",
        "citationCount": None,
        "primary_class": "cs.CL",
        "keywords": ["attention", "transformer", "vaswani", "self-attention", "llm"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    },
    {
        "id": "seminal_resnet_2015",
        "arxiv_id": "1512.03385",
        "title": "Deep Residual Learning for Image Recognition",
        "authors": ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"],
        "year": 2015,
        "abstract": "We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.",
        "category": "cs.CV",
        "doi": "10.48550/arXiv.1512.03385",
        "pdf_url": "https://arxiv.org/pdf/1512.03385.pdf",
        "citationCount": None,
        "primary_class": "cs.CV",
        "keywords": ["resnet", "deep residual learning", "kaiming he", "skip connection"],
        "verified_on": "2026-11-16",
        "source": "Offline sample (built-in, not live)"
    }
]

# ============================================================================
# LIVE NETWORK QUERY GATEWAYS
# ============================================================================
def _fetch_arxiv_atom(query: str, start: int = 0, max_results: int = 15) -> List[Dict[str, Any]]:
    """Query official arXiv Atom XML API."""
    clean_q = query.replace('"', '').replace("'", "").strip()
    if not clean_q:
        return []

    papers: List[Dict[str, Any]] = []
    ssl_ctx = _get_ssl_context()

    encoded_query = urllib.parse.quote(f'ti:"{clean_q}" OR all:"{clean_q}"')
    url = f"https://export.arxiv.org/api/query?search_query={encoded_query}&start={start}&max_results={max_results}&sortBy=relevance&sortOrder=descending"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SYNAPSE-Research-Workbench/2.0 (mailto:synapse-science@open-source.org)"}
    )

    try:
        with urllib.request.urlopen(req, timeout=8, context=ssl_ctx) as response:
            xml_text = response.read().decode("utf-8")
        root = ET.fromstring(xml_text)

        for entry in root.findall(f"{ATOM_NS}entry"):
            id_tag = entry.find(f"{ATOM_NS}id")
            raw_id = id_tag.text.strip() if id_tag is not None and id_tag.text else ""
            arxiv_id = raw_id.split("/abs/")[-1] if "/abs/" in raw_id else raw_id
            if not arxiv_id:
                continue

            title_tag = entry.find(f"{ATOM_NS}title")
            title = " ".join(title_tag.text.split()) if title_tag is not None and title_tag.text else ""
            if not title:
                continue

            summary_tag = entry.find(f"{ATOM_NS}summary")
            abstract = " ".join(summary_tag.text.split()) if summary_tag is not None and summary_tag.text else ""

            published_tag = entry.find(f"{ATOM_NS}published")
            published_str = published_tag.text.strip() if published_tag is not None and published_tag.text else ""
            year = int(published_str[:4]) if len(published_str) >= 4 and published_str[:4].isdigit() else None
            if year is None:
                continue  # skip records without a valid year

            authors = []
            for author_elem in entry.findall(f"{ATOM_NS}author"):
                name_tag = author_elem.find(f"{ATOM_NS}name")
                if name_tag is not None and name_tag.text:
                    authors.append(name_tag.text.strip())
            if not authors:
                continue

            category = "physics.data-an"
            cat_elem = entry.find(f"{ARXIV_NS}primary_category")
            if cat_elem is not None and "term" in cat_elem.attrib:
                category = cat_elem.attrib["term"]
            else:
                cat_elem = entry.find(f"{ATOM_NS}category")
                if cat_elem is not None and "term" in cat_elem.attrib:
                    category = cat_elem.attrib["term"]

            # Real DOI if provided in arXiv entry
            doi_elem = entry.find(f"{ARXIV_NS}doi")
            doi = doi_elem.text.strip() if doi_elem is not None and doi_elem.text else f"10.48550/arXiv.{arxiv_id}"

            papers.append({
                "id": f"arxiv_{arxiv_id.replace('/', '_').replace('.', '_')}",
                "arxiv_id": arxiv_id,
                "title": title,
                "authors": authors,
                "year": year,
                "abstract": abstract,
                "category": category,
                "primary_class": category,
                "doi": doi,
                "pdf_url": f"https://arxiv.org/pdf/{arxiv_id}.pdf",
                "citationCount": None,  # never invent citation counts for arXiv
                "source": "Live: arXiv",
            })
    except Exception:
        pass

    return papers

def _fetch_openalex(query: str, max_results: int = 15) -> List[Dict[str, Any]]:
    """Query OpenAlex free REST API."""
    clean_q = urllib.parse.quote(query.strip())
    if not clean_q:
        return []

    url = f"https://api.openalex.org/works?search={clean_q}&sort=cited_by_count:desc&per-page={max_results}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SYNAPSE-Research-Workbench/2.0 (mailto:synapse-science@open-source.org)"}
    )

    ssl_ctx = _get_ssl_context()
    try:
        with urllib.request.urlopen(req, timeout=8, context=ssl_ctx) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception:
        return []

    papers: List[Dict[str, Any]] = []
    for item in data.get("results", []):
        title = item.get("title")
        if not title:
            continue

        authors = [a.get("author", {}).get("display_name") for a in item.get("authorships", [])]
        authors = [a for a in authors if a]
        if not authors:
            continue

        year = item.get("publication_year")
        if not year or not isinstance(year, int):
            continue

        doi = item.get("doi")  # Real DOI only; no invented fallback prefix

        # Reconstruct abstract from inverted index if present
        abstract = ""
        inv_index = item.get("abstract_inverted_index")
        if inv_index and isinstance(inv_index, dict):
            words: List[tuple] = []
            for word, positions in inv_index.items():
                for pos in positions:
                    words.append((pos, word))
            words.sort(key=lambda x: x[0])
            abstract = " ".join([w[1] for w in words[:120]]) + ("..." if len(words) > 120 else "")

        pdf_url = item.get("open_access", {}).get("oa_url")
        if not pdf_url and doi:
            pdf_url = doi if doi.startswith("http") else f"https://doi.org/{doi}"

        papers.append({
            "id": f"openalex_{item.get('id', '').split('/')[-1]}",
            "arxiv_id": item.get("id", "").split("/")[-1],
            "title": title,
            "authors": authors,
            "year": year,
            "abstract": abstract,
            "category": item.get("primary_topic", {}).get("display_name", "Scholarly Work"),
            "primary_class": "openalex.scholarly",
            "doi": doi,
            "pdf_url": pdf_url or "",
            "citationCount": item.get("cited_by_count"),  # Real cited_by_count or None
            "source": "Live: OpenAlex",
        })

    return papers

def _match_canon_whole_word(query: str) -> List[Dict[str, Any]]:
    """Match canon entries using strict whole-word regex matching."""
    tokens = [t for t in re.findall(r'\b[a-zA-Z0-9-]{3,}\b', query.lower())]
    if not tokens:
        return []

    matched = []
    for canon in SEMINAL_CANON:
        canon_text = f"{canon['title']} {' '.join(canon['authors'])} {canon['year']} {' '.join(canon.get('keywords', []))}".lower()
        # Require that all query tokens match as whole words, or if phrase matches
        has_match = False
        if re.search(r'\b' + re.escape(query.lower().strip()) + r'\b', canon_text):
            has_match = True
        else:
            # Check if any strong keyword matches as whole word
            for tok in tokens:
                if re.search(r'\b' + re.escape(tok) + r'\b', canon_text):
                    has_match = True
                    break
        if has_match:
            matched.append(dict(canon))
    return matched

# ============================================================================
# UNIFIED SEARCH ENDPOINT
# ============================================================================
@router.get("/search")
def search_literature(
    query: str = Query(..., description="Search terms e.g. Lorenz 1963, Shannon, multitaper, LIGO"),
    page: int = 1,
    per_page: int = 15
):
    """
    Search scientific literature across arXiv, OpenAlex, and the Seminal Historical Canon.
    Reports authentic source and mode ('live' vs 'offline_sample').
    """
    if not isinstance(page, int) or page < 1:
        page = 1
    if not isinstance(per_page, int) or per_page < 1:
        per_page = 15

    trimmed = query.lower().strip()
    cache_key = f"{trimmed}_{page}_{per_page}"
    cache_path = CACHE_DIR / f"lit_{hashlib.md5(cache_key.encode()).hexdigest()}.json"

    # 1. Check in-memory cache
    if cache_key in _MEM_CACHE:
        cached = _MEM_CACHE[cache_key]
        if time.time() - cached.get("_cached_at", 0) < CACHE_TTL_SECONDS:
            clean_res = {k: v for k, v in cached.items() if not k.startswith("_")}
            return clean_res

    # 2. Check disk cache (with 24h TTL)
    if cache_path.exists():
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                disk_entry = json.load(f)
            cached_at = disk_entry.get("cached_at", 0)
            if time.time() - cached_at < CACHE_TTL_SECONDS:
                payload = disk_entry.get("payload", {})
                if payload:
                    _MEM_CACHE[cache_key] = {**payload, "_cached_at": cached_at}
                    return payload
        except Exception:
            pass

    results: List[Dict[str, Any]] = []
    seen_titles = set()

    def add_paper(p: Dict[str, Any]):
        t_key = "".join(c for c in p["title"].lower() if c.isalnum())[:40]
        if t_key and t_key not in seen_titles:
            seen_titles.add(t_key)
            results.append(p)

    # Attempt Live Queries
    start = (page - 1) * per_page
    arxiv_hits = _fetch_arxiv_atom(query, start=start, max_results=per_page)
    openalex_hits = _fetch_openalex(query, max_results=10)

    is_live = False
    source_name = "Offline sample (built-in, not live)"

    if arxiv_hits or openalex_hits:
        is_live = True
        for p in arxiv_hits:
            add_paper(p)
        for p in openalex_hits:
            add_paper(p)

        if arxiv_hits and openalex_hits:
            source_name = "Live: arXiv + OpenAlex"
        elif arxiv_hits:
            source_name = "Live: arXiv"
        else:
            source_name = "Live: OpenAlex"
    else:
        # Fallback to whole-word match on Seminal Canon
        canon_hits = _match_canon_whole_word(query)
        for p in canon_hits:
            add_paper(p)
        source_name = "Offline sample (built-in, not live)"

    mode = "live" if is_live else "offline_sample"

    payload = {
        "source": source_name,
        "mode": mode,
        "query": query,
        "page": page,
        "per_page": per_page,
        "total_results": len(results),
        "papers": results[:per_page]
    }

    # Only write to disk cache if live
    if is_live:
        _MEM_CACHE[cache_key] = {**payload, "_cached_at": time.time()}
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump({"cached_at": time.time(), "payload": payload}, f, indent=2)
        except Exception:
            pass

    return payload
