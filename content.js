(function startAnsiTube() {
  "use strict";

  const Core = globalThis.AnsiTubeCore;
  if (!Core) return;

  const PRESETS = {
    potato: { columns: 80, fps: 12, palette: "ansi16" },
    balanced: { columns: 120, fps: 15, palette: "ansi32" },
    deluxe: { columns: 160, fps: 24, palette: "truecolor" }
  };

  const DEFAULTS = {
    preset: "balanced",
    columns: 120,
    fps: 15,
    palette: "ansi32",
    saturationBoost: 0.42,
    brightnessBoost: 0.17,
    blackThreshold: 0.035,
    edgeThreshold: 0.24,
    opacity: 1,
    adaptive: true
  };

  class AnsiTube {
    constructor() {
      this.active = false;
      this.video = null;
      this.host = null;
      this.canvas = null;
      this.context = null;
      this.sampleCanvas = document.createElement("canvas");
      this.sampleContext = this.sampleCanvas.getContext("2d", { willReadFrequently: true, alpha: false });
      this.panel = null;
      this.settings = { ...DEFAULTS };
      this.runtimeColumns = DEFAULTS.columns;
      this.runtimeFps = DEFAULTS.fps;
      this.buffers = null;
      this.outputImage = null;
      this.raf = 0;
      this.lastFrameAt = 0;
      this.lastVideoTime = -1;
      this.performanceSamples = [];
      this.lastUrl = location.href;
      this.navigationTimer = 0;
      this.boundLoop = (time) => this.loop(time);
      this.observeNavigation();
    }

    async loadSettings() {
      const saved = await chrome.storage.local.get(DEFAULTS);
      this.settings = { ...DEFAULTS, ...saved };
      this.runtimeColumns = this.settings.columns;
      this.runtimeFps = this.settings.fps;
    }

    async toggle() {
      if (this.active) {
        this.stop();
        return;
      }
      await this.start();
    }

    findVideo() {
      return [...document.querySelectorAll("video")]
        .filter((candidate) => candidate.videoWidth > 0 && candidate.videoHeight > 0)
        .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] || null;
    }

    findHost(video) {
      return video.closest("#movie_player, .html5-video-player") || video.parentElement;
    }

    async start() {
      await this.loadSettings();
      const video = this.findVideo();
      if (!video) {
        this.temporaryNotice("Open a YouTube video, then click ANSI Tube again.");
        return;
      }

      this.video = video;
      this.host = this.findHost(video);
      this.host.classList.add("ansi-tube-host");
      this.createCanvas();
      this.createPanel();
      this.active = true;
      this.lastFrameAt = 0;
      this.lastVideoTime = -1;
      this.performanceSamples.length = 0;
      this.setStatus("Starting live conversion…", "ok");
      this.raf = requestAnimationFrame(this.boundLoop);
    }

    stop() {
      this.active = false;
      cancelAnimationFrame(this.raf);
      this.canvas?.remove();
      this.panel?.remove();
      this.host?.classList.remove("ansi-tube-host");
      this.canvas = null;
      this.panel = null;
      this.buffers = null;
      this.outputImage = null;
    }

    createCanvas() {
      this.canvas?.remove();
      this.canvas = document.createElement("canvas");
      this.canvas.className = "ansi-tube-canvas";
      this.canvas.setAttribute("aria-label", "Live CP437 ANSI rendering");
      this.canvas.style.opacity = String(this.settings.opacity);
      this.context = this.canvas.getContext("2d", { alpha: false });
      this.context.imageSmoothingEnabled = false;
      this.host.appendChild(this.canvas);
      this.rebuildGrid();
    }

    rebuildGrid() {
      if (!this.video || !this.canvas) return;
      const aspect = this.video.videoWidth / this.video.videoHeight;
      const grid = Core.computeGrid(this.runtimeColumns, aspect);
      this.sampleCanvas.width = grid.columns * 2;
      this.sampleCanvas.height = grid.rows * 2;
      this.canvas.width = grid.columns * Core.CELL_WIDTH;
      this.canvas.height = grid.rows * Core.CELL_HEIGHT;
      this.context.imageSmoothingEnabled = false;
      this.buffers = Core.createBuffers(grid.columns, grid.rows);
      this.outputImage = new ImageData(this.buffers.image, this.canvas.width, this.canvas.height);
      this.updateRuntimeLabels();
    }

    loop(now) {
      if (!this.active) return;
      this.raf = requestAnimationFrame(this.boundLoop);
      if (document.hidden || !this.video || this.video.readyState < 2) return;

      const interval = 1000 / this.runtimeFps;
      if (now - this.lastFrameAt < interval) return;
      if (this.video.paused && this.video.currentTime === this.lastVideoTime) return;
      this.lastFrameAt = now;
      this.lastVideoTime = this.video.currentTime;

      const started = performance.now();
      try {
        this.sampleContext.drawImage(
          this.video,
          0,
          0,
          this.sampleCanvas.width,
          this.sampleCanvas.height
        );
        const source = this.sampleContext.getImageData(
          0,
          0,
          this.sampleCanvas.width,
          this.sampleCanvas.height
        );
        Core.convertInto(
          source.data,
          this.sampleCanvas.width,
          this.sampleCanvas.height,
          this.settings,
          this.buffers
        );
        this.context.putImageData(this.outputImage, 0, 0);
        this.recordPerformance(performance.now() - started);
        if (this.performanceSamples.length === 1) this.setStatus("Live", "ok");
      } catch (error) {
        this.setStatus(
          error?.name === "SecurityError"
            ? "This video protects its pixels from browser-canvas access."
            : `Renderer paused: ${error?.message || "unknown error"}`,
          "error"
        );
        this.active = false;
      }
    }

    recordPerformance(milliseconds) {
      this.performanceSamples.push(milliseconds);
      if (this.performanceSamples.length > 24) this.performanceSamples.shift();
      if (!this.settings.adaptive || this.performanceSamples.length < 24) return;

      const average = this.performanceSamples.reduce((sum, value) => sum + value, 0) / this.performanceSamples.length;
      const budget = 1000 / this.runtimeFps;
      if (average < budget * 0.82) return;

      if (this.runtimeFps > 12) {
        const steps = [30, 24, 20, 15, 12];
        const lower = [...steps].reverse().find((value) => value < this.runtimeFps);
        this.runtimeFps = lower || 12;
      } else if (this.runtimeColumns > 80) {
        this.runtimeColumns = Math.max(80, Math.round(this.runtimeColumns * 0.8 / 4) * 4);
        this.rebuildGrid();
      }
      this.performanceSamples.length = 0;
      this.setStatus(`Adaptive mode: ${this.runtimeColumns} cols · ${this.runtimeFps} FPS`, "ok");
      this.updateRuntimeLabels();
    }

    createPanel() {
      this.panel?.remove();
      const panel = document.createElement("section");
      panel.className = "ansi-tube-panel";
      panel.dataset.collapsed = "false";
      panel.innerHTML = `
        <div class="ansi-tube-heading">
          <span class="ansi-tube-brand">ANSI TUBE</span>
          <div>
            <button type="button" data-action="collapse" title="Collapse controls">−</button>
            <button type="button" data-action="close" title="Exit ANSI mode">×</button>
          </div>
        </div>
        <div class="ansi-tube-controls">
          <div class="ansi-tube-row">
            <label for="ansi-tube-preset">Preset</label>
            <select id="ansi-tube-preset" data-setting="preset">
              <option value="potato">Potato</option>
              <option value="balanced">Balanced</option>
              <option value="deluxe">Deluxe</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-columns">Columns</label>
            <input id="ansi-tube-columns" data-setting="columns" type="range" min="60" max="200" step="4">
            <span class="ansi-tube-value" data-value="columns"></span>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-fps">ANSI FPS</label>
            <input id="ansi-tube-fps" data-setting="fps" type="range" min="8" max="30" step="1">
            <span class="ansi-tube-value" data-value="fps"></span>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-palette">Palette</label>
            <select id="ansi-tube-palette" data-setting="palette">
              <option value="ansi16">ANSI 16</option>
              <option value="ansi32">ANSI 32</option>
              <option value="truecolor">Truecolor</option>
            </select>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-color">Color boost</label>
            <input id="ansi-tube-color" data-setting="saturationBoost" type="range" min="0" max="0.8" step="0.02">
            <span class="ansi-tube-value" data-value="saturationBoost"></span>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-brightness">Brightness</label>
            <input id="ansi-tube-brightness" data-setting="brightnessBoost" type="range" min="0" max="0.5" step="0.01">
            <span class="ansi-tube-value" data-value="brightnessBoost"></span>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-black">Black floor</label>
            <input id="ansi-tube-black" data-setting="blackThreshold" type="range" min="0" max="0.15" step="0.005">
            <span class="ansi-tube-value" data-value="blackThreshold"></span>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-opacity">ANSI mix</label>
            <input id="ansi-tube-opacity" data-setting="opacity" type="range" min="0" max="1" step="0.05">
            <span class="ansi-tube-value" data-value="opacity"></span>
          </div>
          <label class="ansi-tube-row ansi-tube-check">
            <input data-setting="adaptive" type="checkbox">
            Adapt automatically on slower hardware
          </label>
          <div class="ansi-tube-actions">
            <button type="button" data-action="png">Save PNG</button>
            <button type="button" data-action="ans">Save .ANS</button>
          </div>
          <div class="ansi-tube-status" role="status"></div>
        </div>
      `;
      this.host.appendChild(panel);
      this.panel = panel;
      this.syncControls();
      panel.addEventListener("click", (event) => this.handlePanelClick(event));
      panel.addEventListener("input", (event) => this.handleSettingInput(event));
      panel.addEventListener("change", (event) => this.handleSettingInput(event));
    }

    syncControls() {
      if (!this.panel) return;
      for (const input of this.panel.querySelectorAll("[data-setting]")) {
        const key = input.dataset.setting;
        if (input.type === "checkbox") input.checked = Boolean(this.settings[key]);
        else input.value = this.settings[key];
      }
      this.updateRuntimeLabels();
    }

    updateRuntimeLabels() {
      if (!this.panel) return;
      const formats = {
        columns: () => String(this.runtimeColumns),
        fps: () => String(this.runtimeFps),
        saturationBoost: () => `${Math.round(this.settings.saturationBoost * 100)}%`,
        brightnessBoost: () => `${Math.round(this.settings.brightnessBoost * 100)}%`,
        blackThreshold: () => this.settings.blackThreshold.toFixed(3),
        opacity: () => `${Math.round(this.settings.opacity * 100)}%`
      };
      for (const [key, formatter] of Object.entries(formats)) {
        const output = this.panel.querySelector(`[data-value="${key}"]`);
        if (output) output.textContent = formatter();
      }
    }

    handlePanelClick(event) {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      event.stopPropagation();
      if (action === "close") this.stop();
      if (action === "collapse") {
        const collapsed = this.panel.dataset.collapsed !== "true";
        this.panel.dataset.collapsed = String(collapsed);
        event.target.textContent = collapsed ? "+" : "−";
      }
      if (action === "png") this.exportPng();
      if (action === "ans") this.exportAns();
    }

    handleSettingInput(event) {
      const input = event.target.closest("[data-setting]");
      if (!input) return;
      event.stopPropagation();
      const key = input.dataset.setting;

      if (key === "preset") {
        const preset = PRESETS[input.value];
        if (preset) Object.assign(this.settings, preset, { preset: input.value });
      } else if (input.type === "checkbox") {
        this.settings[key] = input.checked;
      } else if (input.type === "range") {
        this.settings[key] = Number(input.value);
        this.settings.preset = "custom";
      } else {
        this.settings[key] = input.value;
        this.settings.preset = "custom";
      }

      this.runtimeColumns = this.settings.columns;
      this.runtimeFps = this.settings.fps;
      this.canvas.style.opacity = String(this.settings.opacity);
      if (key === "columns" || key === "preset") this.rebuildGrid();
      this.performanceSamples.length = 0;
      chrome.storage.local.set(this.settings);
      this.syncControls();
    }

    setStatus(message, kind = "") {
      const status = this.panel?.querySelector(".ansi-tube-status");
      if (!status) return;
      status.textContent = message;
      status.dataset.kind = kind;
    }

    safeFilename(extension) {
      const title = (document.querySelector("h1 yt-formatted-string")?.textContent || document.title || "youtube-frame")
        .replace(/\s+-\s+YouTube\s*$/, "")
        .replace(/[^a-z0-9 _-]+/gi, "")
        .trim()
        .replace(/\s+/g, "_")
        .slice(0, 90) || "youtube-frame";
      return `${title}_cp437_blocks.${extension}`;
    }

    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    exportPng() {
      this.canvas.toBlob((blob) => {
        if (blob) this.downloadBlob(blob, this.safeFilename("png"));
      }, "image/png");
    }

    exportAns() {
      if (!this.buffers) return;
      const ansi = Core.buildAns(this.buffers, this.settings.palette);
      this.downloadBlob(new Blob([ansi], { type: "text/plain;charset=utf-8" }), this.safeFilename("ans"));
    }

    temporaryNotice(message) {
      const notice = document.createElement("div");
      notice.className = "ansi-tube-panel";
      notice.style.position = "fixed";
      notice.style.zIndex = "2147483647";
      notice.style.top = "16px";
      notice.style.left = "16px";
      notice.textContent = message;
      document.documentElement.appendChild(notice);
      setTimeout(() => notice.remove(), 3500);
    }

    observeNavigation() {
      this.navigationTimer = window.setInterval(() => {
        if (location.href === this.lastUrl) return;
        this.lastUrl = location.href;
        if (!this.active) return;
        this.stop();
        window.setTimeout(() => this.start(), 700);
      }, 500);
    }
  }

  const ansiTube = new AnsiTube();
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "ANSI_TUBE_TOGGLE") ansiTube.toggle();
  });
})();
