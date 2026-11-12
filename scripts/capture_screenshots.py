import os
import subprocess
import time
import socket
from pathlib import Path
from http.server import SimpleHTTPRequestHandler
import socketserver
import threading

ROOT_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT_DIR / "apps" / "web" / "dist"
SCREENSHOTS_DIR = ROOT_DIR / "docs" / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

def start_server(port=5173):
    httpd = socketserver.TCPServer(("127.0.0.1", port), CustomHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd

def capture(url, out_path, width=1440, height=900, delay=2):
    cmd = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        f"--window-size={width},{height}",
        f"--screenshot={out_path}",
        "--virtual-time-budget=3000",
        "--hide-scrollbars",
        url
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Captured: {out_path.name} ({width}x{height})")

def main():
    if not DIST_DIR.exists():
        print(f"Dist dir not found at {DIST_DIR}")
        return

    port = 5173
    print(f"Starting server on port {port} serving {DIST_DIR}...")
    server = start_server(port)
    time.sleep(1)

    targets = [
        ("http://127.0.0.1:5173", SCREENSHOTS_DIR / "landing_page_1440.png", 1440, 900),
        ("http://127.0.0.1:5173", SCREENSHOTS_DIR / "landing_page_390.png", 390, 844),
        ("http://127.0.0.1:5173/#/workbench", SCREENSHOTS_DIR / "paper_workbench_1440.png", 1440, 900),
        ("http://127.0.0.1:5173/#/workbench", SCREENSHOTS_DIR / "paper_workbench_390.png", 390, 844),
        ("http://127.0.0.1:5173/#/rack", SCREENSHOTS_DIR / "instrument_rack_1440.png", 1440, 900),
        ("http://127.0.0.1:5173/#/rack", SCREENSHOTS_DIR / "instrument_rack_390.png", 390, 844),
        ("http://127.0.0.1:5173/#/benchmarks", SCREENSHOTS_DIR / "benchmarks_view_1440.png", 1440, 900),
        ("http://127.0.0.1:5173/#/papergraph", SCREENSHOTS_DIR / "papergraph_1440.png", 1440, 900),
    ]

    for url, out, w, h in targets:
        try:
            capture(url, out, w, h)
        except Exception as e:
            print(f"Error capturing {out.name}: {e}")

    server.shutdown()
    print("Screenshots captured successfully!")

if __name__ == "__main__":
    main()

