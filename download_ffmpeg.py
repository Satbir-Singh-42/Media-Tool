"""
download_ffmpeg.py — Run this after cloning to fetch the FFmpeg WASM binary.

Usage:
    python download_ffmpeg.py
"""
import urllib.request
import os

FILES = [
    (
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
        "static/js/ffmpeg/ffmpeg-core.wasm",
        "FFmpeg Core WASM (~31MB)"
    ),
]

os.makedirs("static/js/ffmpeg", exist_ok=True)

for url, dest, label in FILES:
    if os.path.exists(dest):
        print(f"[skip] {label} already exists at {dest}")
        continue

    print(f"[download] {label} ...")
    try:
        urllib.request.urlretrieve(url, dest)
        size_mb = os.path.getsize(dest) / 1024 / 1024
        print(f"[done] {dest} ({size_mb:.1f} MB)")
    except Exception as e:
        print(f"[error] Failed to download {label}: {e}")

print("\nAll done! Run `python app.py` to start the server.")
