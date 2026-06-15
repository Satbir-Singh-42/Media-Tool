/* ────────────────────────────────────────────────────────────
   Media Tools PRO  ·  Frontend Logic (WASM Edition)
   ──────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  /* ── DOM Elements ───────────────────────────────────────── */
  const toolItems = document.querySelectorAll(".lang-item");
  const toolViews = document.querySelectorAll(".tool-view");
  const selectedToolBadge = $("selectedToolBadge");

  const statusDot = $("statusDot");
  const statusText = $("statusText");
  const loaderOverlay = $("loaderOverlay");
  const loaderText = $("loaderText");
  
  const loaderSpinner = $("loaderSpinner");
  const progressContainer = $("progressContainer");
  const progressFill = $("progressFill");
  const progressPercent = $("progressPercent");
  const progressEta = $("progressEta");

  const themeToggle = $("themeToggle");
  const iconMoon = $("iconMoon");
  const iconSun = $("iconSun");

  const donateBtn = $("donateBtn");
  const donateModal = $("donateModal");
  const donateClose = $("donateClose");

  const sidebarToggle = $("sidebarToggle");
  const sidebar = $("sidebar");

  /* ── FFmpeg Setup ───────────────────────────────────────── */
  const { FFmpeg } = FFmpegWASM;
  const { fetchFile, toBlobURL } = FFmpegUtil;
  
  let ffmpeg = null;
  let startTime = 0;

  /* ── Upload Limit ───────────────────────────────────────── */
  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB in bytes

  function checkFileSize(file) {
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(0);
      return `File is ${sizeMB} MB — exceeds the 2 GB limit. Please use a smaller file.`;
    }
    return null;
  }

  async function loadFFmpeg() {
    if (ffmpeg === null) {
      ffmpeg = new FFmpeg();
      
      ffmpeg.on('log', ({ message }) => console.log(message));
      
      ffmpeg.on('progress', ({ progress, time }) => {
        // progress is a ratio between 0 and 1
        const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
        progressFill.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        
        // Calculate ETA manually
        if (progress > 0 && progress < 1) {
          const elapsed = (Date.now() - startTime) / 1000; // seconds
          const totalEst = elapsed / progress;
          const remaining = Math.max(0, totalEst - elapsed);
          
          if (remaining > 60) {
            const mins = Math.floor(remaining / 60);
            const secs = Math.floor(remaining % 60);
            progressEta.textContent = `${mins}m ${secs}s remaining`;
          } else {
            progressEta.textContent = `${Math.floor(remaining)}s remaining`;
          }
        } else {
          progressEta.textContent = `Finishing...`;
        }
      });
      
      showLoader("Loading compression engine... (~30MB download first time)", false);
      
      // Load from local static files (same-origin) — no CORS issues
      await ffmpeg.load({
        coreURL: '/static/js/ffmpeg/ffmpeg-core.js',
        wasmURL: '/static/js/ffmpeg/ffmpeg-core.wasm',
      });
    }
  }

  /* ── Theme ──────────────────────────────────────────────── */
  let isDark = true;
  function applyTheme(dark) {
    isDark = dark;
    document.body.classList.toggle("light", !dark);
    iconMoon.style.display = dark ? "" : "none";
    iconSun.style.display = !dark ? "" : "none";
    localStorage.setItem("media-theme", dark ? "dark" : "light");
  }

  themeToggle.addEventListener("click", () => applyTheme(!isDark));
  if (localStorage.getItem("media-theme") === "light") applyTheme(false);

  /* ── Sidebar (mobile) ───────────────────────────────────── */
  sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  document.addEventListener("click", e => {
    if (window.innerWidth <= 720 &&
      !sidebar.contains(e.target) &&
      !sidebarToggle.contains(e.target)) {
      sidebar.classList.remove("open");
    }
  });

  /* ── Donate Modal ───────────────────────────────────────── */
  if (donateBtn && donateModal) {
    donateBtn.addEventListener("click", () => donateModal.classList.add("visible"));
    donateClose.addEventListener("click", () => donateModal.classList.remove("visible"));
    donateModal.addEventListener("click", (e) => {
      if (e.target === donateModal) donateModal.classList.remove("visible");
    });
  }

  /* ── Status Helpers ─────────────────────────────────────── */
  function setStatus(state, msg) {
    statusDot.className = `status-dot ${state}`;
    statusText.textContent = msg;
  }
  
  function showLoader(msg, withProgress = false) {
    loaderText.textContent = msg;
    loaderOverlay.classList.add("visible");
    
    if (withProgress) {
      loaderSpinner.style.display = "none";
      progressContainer.style.display = "flex";
      progressFill.style.width = "0%";
      progressPercent.textContent = "0%";
      progressEta.textContent = "Initializing...";
    } else {
      loaderSpinner.style.display = "block";
      progressContainer.style.display = "none";
    }
  }
  
  function hideLoader() {
    loaderOverlay.classList.remove("visible");
    progressContainer.style.display = "none";
    loaderSpinner.style.display = "block";
  }

  /* ── Tool Switching ─────────────────────────────────────── */
  toolItems.forEach(item => {
    item.addEventListener("click", () => {
      toolItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      const toolId = item.dataset.id;
      const toolName = item.dataset.name;

      selectedToolBadge.textContent = toolName;
      selectedToolBadge.style.transform = "scale(1.08)";
      setTimeout(() => (selectedToolBadge.style.transform = ""), 180);

      toolViews.forEach(v => v.classList.remove("active"));
      const activeView = $(`view-${toolId}`);
      if (activeView) activeView.classList.add("active");

      if (window.innerWidth <= 720) sidebar.classList.remove("open");
      setStatus("ready", `Ready — ${toolName}`);
    });
  });

  /* ── File Upload Helpers ────────────────────────────────── */
  function renderFileList(files, containerId) {
    const container = $(containerId);
    container.innerHTML = "";
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const div = document.createElement("div");
      div.className = "file-item";
      div.innerHTML = `<span>${file.name}</span> <span style="color:var(--text-3)">${(file.size / 1024 / 1024).toFixed(2)} MB</span>`;
      container.appendChild(div);
    }
  }

  /* ── Tool 1: Video to MP3 ───────────────────────────────── */
  const fileVideo = $("file-video2mp3");
  const listVideo = $("list-video2mp3");
  const btnVideoAction = $("btn-video2mp3-action");
  const btnVideoClear = $("btn-video2mp3-clear");
  let videoFileObj = null;

  fileVideo.addEventListener("change", e => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const err = checkFileSize(file);
      if (err) {
        fileVideo.value = "";
        videoFileObj = null;
        renderFileList([], "list-video2mp3");
        return setStatus("error", err);
      }
      videoFileObj = file;
      renderFileList([videoFileObj], "list-video2mp3");
      setStatus("ready", "File ready — click Extract Audio (MP3)");
    }
  });

  btnVideoClear.addEventListener("click", () => {
    fileVideo.value = "";
    videoFileObj = null;
    renderFileList([], "list-video2mp3");
  });

  btnVideoAction.addEventListener("click", async () => {
    if (!videoFileObj) return setStatus("error", "Please select a video file");
    const sizeErr = checkFileSize(videoFileObj);
    if (sizeErr) return setStatus("error", sizeErr);

    setStatus("loading", "Extracting audio...");
    showLoader("Initializing...", true);
    
    try {
      await loadFFmpeg();
      
      loaderText.textContent = "Reading file into memory...";
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFileObj));
      
      loaderText.textContent = "Extracting Audio (MP3)...";
      startTime = Date.now();
      
      await ffmpeg.exec(['-i', 'input.mp4', '-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k', 'output.mp3']);
      
      loaderText.textContent = "Finalizing download...";
      const data = await ffmpeg.readFile('output.mp3');
      
      // Create download link
      const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = videoFileObj.name.split('.')[0] + '.mp3';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup virtual filesystem
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp3');
      
      setStatus("done", "Audio extracted successfully!");
    } catch (e) {
      console.error(e);
      setStatus("error", e.message || "Extraction failed");
    } finally {
      hideLoader();
    }
  });

  /* ── Tool 2: Compress Video ────────────────────────────── */
  const fileCompressVideo = $("file-compress-video");
  const listCompressVideo = $("list-compress-video");
  const btnCompressVideoAction = $("btn-compress-video-action");
  const btnCompressVideoClear = $("btn-compress-video-clear");
  const compressQuality = $("compress-quality");
  const qualityVal = $("quality-val");
  let compressVideoFileObj = null;

  compressQuality.addEventListener("input", (e) => {
    qualityVal.textContent = e.target.value + "%";
  });

  fileCompressVideo.addEventListener("change", e => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const err = checkFileSize(file);
      if (err) {
        fileCompressVideo.value = "";
        compressVideoFileObj = null;
        renderFileList([], "list-compress-video");
        return setStatus("error", err);
      }
      compressVideoFileObj = file;
      renderFileList([compressVideoFileObj], "list-compress-video");
      setStatus("ready", "File ready — click Compress & Download");
    }
  });

  btnCompressVideoClear.addEventListener("click", () => {
    fileCompressVideo.value = "";
    compressVideoFileObj = null;
    renderFileList([], "list-compress-video");
  });

  btnCompressVideoAction.addEventListener("click", async () => {
    if (!compressVideoFileObj) return setStatus("error", "Please select a video to compress");
    const sizeErr = checkFileSize(compressVideoFileObj);
    if (sizeErr) return setStatus("error", sizeErr);

    setStatus("loading", "Compressing video...");
    showLoader("Initializing...", true);
    
    try {
      await loadFFmpeg();
      
      loaderText.textContent = "Reading file into memory...";
      await ffmpeg.writeFile('input.mp4', await fetchFile(compressVideoFileObj));
      
      loaderText.textContent = "Compressing Video...";
      startTime = Date.now();
      
      // Map quality to CRF: 90=22, 10=40
      const quality = parseInt(compressQuality.value, 10);
      const crfVal = Math.round(40 - ((quality - 10) * 18 / 80));
      
      await ffmpeg.exec(['-i', 'input.mp4', '-vcodec', 'libx264', '-crf', crfVal.toString(), '-preset', 'fast', 'output.mp4']);
      
      loaderText.textContent = "Finalizing download...";
      const data = await ffmpeg.readFile('output.mp4');
      
      // Create download link
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = compressVideoFileObj.name.split('.')[0] + '_compressed.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup virtual filesystem
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');
      
      setStatus("done", "Video compressed successfully!");
      
    } catch (e) {
      console.error(e);
      setStatus("error", e.message || "Compression failed");
    } finally {
      hideLoader();
    }
  });

  /* ── Drag & Drop Initialization ─────────────────────────── */
  function setupDragDrop(zoneId, inputId) {
    const zone = $(zoneId);
    const input = $(inputId);
    if (!zone || !input) return;

    zone.addEventListener("dragover", e => {
      e.preventDefault();
      zone.style.borderColor = "var(--accent)";
      zone.style.background = "rgba(99,102,241,0.1)";
    });
    zone.addEventListener("dragleave", e => {
      e.preventDefault();
      zone.style.borderColor = "";
      zone.style.background = "";
    });
    zone.addEventListener("drop", e => {
      e.preventDefault();
      zone.style.borderColor = "";
      zone.style.background = "";
      if (e.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
    });
  }

  setupDragDrop("drop-video2mp3", "file-video2mp3");
  setupDragDrop("drop-compress-video", "file-compress-video");

})();
