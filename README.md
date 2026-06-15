# Media Tools PRO

Media Tools PRO is a sleek, modern, and completely free web-based media toolkit. Built as "donationware," it offers a highly polished experience with **no paywalls, no sign-ups, and no file uploads to any server** — everything runs directly in your browser.

## Features

- **Video to MP3**: Extract high-quality audio (192kbps) from any video file (MP4, MKV, AVI) — up to 2GB.
- **Compress Video**: Reduce video file size using H.264 compression with adjustable quality — all in-browser, no upload needed.
- **Privacy First**: All media processing happens **locally in your browser** using FFmpeg WebAssembly. Your files never leave your device.
- **Premium UI/UX**: Responsive design with smooth animations, progress tracking with ETA, and a Dark/Light mode toggle.

## Tech Stack

- **Backend**: Python, Flask (serves HTML/static files only — no media processing on server)
- **Frontend**: Vanilla JavaScript, CSS (custom properties), HTML5
- **Media Engine**: [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) v0.12 — runs FFmpeg natively in the browser via WebAssembly

## How It Works

All video/audio processing is done client-side using **FFmpeg compiled to WebAssembly**. The app requires `SharedArrayBuffer`, which in turn requires two security headers on every response:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

These are set automatically by Flask (`app.py`) for local development and by `vercel.json` for production.

## Local Development Setup

1. **Clone the repository** (or download the source).
2. **No system FFmpeg needed** — the WASM engine is bundled in `static/js/ffmpeg/`.
3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the application**:
   ```bash
   python app.py
   ```
   The app will start locally at `http://127.0.0.1:5003`.

> **Note:** The `static/js/ffmpeg/ffmpeg-core.wasm` file is ~31MB. It is served locally to avoid cross-origin Worker restrictions.

## Deploying to Vercel

The `vercel.json` is pre-configured with the required COOP/COEP headers for Vercel deployment. Just connect the repo and deploy — no additional config needed.

## Support & Donationware

This utility is maintained as donationware. If it saves you time, a small tip via the **Support** button in the app keeps development going!
