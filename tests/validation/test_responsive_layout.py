"""
Regression tests for mobile responsiveness and viewport horizontal overflow protection.
"""

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
INDEX_HTML = ROOT_DIR / "apps" / "web" / "index.html"
APP_TSX = ROOT_DIR / "apps" / "web" / "src" / "App.tsx"
TOPBAR_TSX = ROOT_DIR / "apps" / "web" / "src" / "components" / "shell" / "TopBar.tsx"
RACK_TSX = ROOT_DIR / "apps" / "web" / "src" / "views" / "InstrumentRackView.tsx"
WORKBENCH_TSX = ROOT_DIR / "apps" / "web" / "src" / "views" / "PaperWorkbench.tsx"


def test_index_html_has_mobile_viewport():
    assert INDEX_HTML.exists()
    content = INDEX_HTML.read_text(encoding="utf-8")
    assert 'meta name="viewport" content="width=device-width, initial-scale=1.0"' in content


def test_topbar_and_workbench_action_buttons_collapse_on_mobile():
    content_topbar = TOPBAR_TSX.read_text(encoding="utf-8")
    assert "sm:hidden" in content_topbar
    assert "hidden sm:inline" in content_topbar

    content_workbench = WORKBENCH_TSX.read_text(encoding="utf-8")
    assert "sm:hidden" in content_workbench
    assert "hidden sm:inline" in content_workbench


def test_instrument_rack_desktop_layout_restored_with_responsive_padding():
    content_rack = RACK_TSX.read_text(encoding="utf-8")
    assert "w-full max-w-[1680px] mx-auto" in content_rack
    assert "xl:flex-row xl:items-center" in content_rack

