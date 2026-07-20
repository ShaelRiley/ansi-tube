(function startAnsiTube() {
  "use strict";

  const Core = globalThis.AnsiTubeCore;
  if (!Core) return;

  const PRESETS = {
    potato: { columns: 80, fps: 12, colorPalette: "standard", paletteDepth: 8, glyphSet: "restrictAnsi", autoRows: true },
    balanced: { columns: 120, fps: 15, colorPalette: "standard", paletteDepth: 32, glyphSet: "restrictAnsi", autoRows: true },
    deluxe: { columns: 160, fps: 24, colorPalette: "standard", paletteDepth: "truecolor", glyphSet: "restrictAnsi", autoRows: true }
  };

  const HARDWARE_PRESETS = {
    nes: { saturationBoost: 0.35, brightnessBoost: 0.12, blackThreshold: 0.040 },
    sms: { saturationBoost: 0.55, brightnessBoost: 0.18, blackThreshold: 0.040 },
    genesis: { saturationBoost: 0.45, brightnessBoost: 0.12, blackThreshold: 0.035 },
    c64: { saturationBoost: 0.30, brightnessBoost: 0.10, blackThreshold: 0.045 },
    apple2e: { saturationBoost: 0.50, brightnessBoost: 0.16, blackThreshold: 0.050 },
    virtualb: { saturationBoost: 0.65, brightnessBoost: 0.03, blackThreshold: 0.085 },
    gbdmg: { saturationBoost: 0.05, brightnessBoost: 0.04, blackThreshold: 0.055 },
    apple2green: { saturationBoost: 0.12, brightnessBoost: 0.12, blackThreshold: 0.060 },
    snes: { saturationBoost: 0.38, brightnessBoost: 0.15, blackThreshold: 0.035 },
    vexitrexi: { saturationBoost: 0.05, brightnessBoost: 0.14, blackThreshold: 0.050 },
    zedexspectral: { saturationBoost: 0.70, brightnessBoost: 0.20, blackThreshold: 0.050 },
    atari2600: { saturationBoost: 0.55, brightnessBoost: 0.15, blackThreshold: 0.045 },
    atari5200: { saturationBoost: 0.45, brightnessBoost: 0.15, blackThreshold: 0.040 },
    trash80: { saturationBoost: 0.00, brightnessBoost: 0.12, blackThreshold: 0.060 }
  };

  const DEFAULTS = {
    preset: "balanced",
    columns: 120,
    rows: 34,
    autoRows: true,
    crop43: false,
    zoom43: false,
    squash43: false,
    crop11: false,
    zoom11: false,
    squash11: false,
    fps: 15,
    colorPalette: "standard",
    paletteDepth: 32,
    glyphSet: "restrictAnsi",
    saturationBoost: 0.42,
    brightnessBoost: 0.17,
    blackThreshold: 0.035,
    edgeThreshold: 0.24,
    opacity: 1,
    adaptive: true,
    wowFlutter: false,
    bitCrushMode: "off",
    pitchShift: 0,
    audioFilter: "off",
    audioMix: 1,
    scanlines: false,
    panelCollapsed: false,
    visualEffects: false,
    effectStyle: "adaptive",
    effectIntensity: 0.45,
    cowCameo: false,
    cowVolume: 0.8,
    settingsVersion: 9,
    vectorSampleScale: 4,
    vectorEdgeDetail: 0.62,
    vectorLineReach: 4,
    vectorLineWidth: 1.25,
    vectorPointSize: 1.6,
    vectorPoints: true,
    vectorInvert: false,
    videoGlyphStability: 0.48
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
      this.scanlineOverlay = null;
      this.effectsCanvas = null;
      this.effectsContext = null;
      this.cowCanvas = null;
      this.cowContext = null;
      this.cowImage = null;
      this.cowImageState = "idle";
      this.cowAudioContext = null;
      this.effectPrevious = null;
      this.effectCurrent = null;
      this.effectParticles = [];
      this.effectHasHistory = false;
      this.cowState = null;
      this.nextCowCheckAt = 0;
      this.nextCowEligibleAt = 0;
      this.cowForceAt = 0;
      this.panelIdleTimer = 0;
      this.boundPanelActivity = () => this.revealCollapsedPanel();
      this.boundPanelLeave = () => this.scheduleCollapsedPanelFade();
      this.sessionPanelCollapsed = null;
      this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
      this.settings = { ...DEFAULTS };
      this.runtimeColumns = DEFAULTS.columns;
      this.runtimeRows = DEFAULTS.rows;
      this.runtimeFps = DEFAULTS.fps;
      this.runtimeVectorSampleScale = DEFAULTS.vectorSampleScale;
      this.buffers = null;
      this.outputImage = null;
      this.raf = 0;
      this.lastFrameAt = 0;
      this.lastVideoTime = -1;
      this.performanceSamples = [];
      this.lastUrl = location.href;
      this.navigationTimer = 0;
      this.navigationRestartTimer = 0;
      this.desiredActive = false;
      this.transitionPromise = Promise.resolve();
      this.audioByVideo = new WeakMap();
      this.audioGraph = null;
      this.audioGraphPromise = null;
      this.audioGraphPromiseVideo = null;
      this.boundLoop = (time) => this.loop(time);
      this.observeNavigation();
    }

    async loadSettings() {
      const saved = await chrome.storage.local.get(null);
      this.settings = { ...DEFAULTS, ...saved };
      const migrated = {};
      if (this.sessionPanelCollapsed !== null) this.settings.panelCollapsed = this.sessionPanelCollapsed;
      if (!("paletteDepth" in saved) && saved.palette) {
        this.settings.paletteDepth = saved.palette === "ansi16" ? 16 : saved.palette === "truecolor" ? "truecolor" : 32;
      }
      if (!("bitCrushMode" in saved) && saved.bitCrush) this.settings.bitCrushMode = "bit1";
      delete this.settings.bitCrush;
      if (this.settings.colorPalette === "apple2") this.settings.colorPalette = "apple2e";
      if (!saved.settingsVersion || saved.settingsVersion < 9) {
        if (this.settings.colorPalette === "mooburst") {
          this.settings.colorPalette = "moonburst";
          migrated.colorPalette = "moonburst";
        }
        if ("effectIntensity" in saved) {
          const oldIntensity = Math.max(0, Math.min(1, Number(saved.effectIntensity) || 0));
          this.settings.effectIntensity = Math.max(0, Math.min(1, Math.sqrt(Math.max(0, oldIntensity - 0.015) / 0.26)));
          migrated.effectIntensity = this.settings.effectIntensity;
        }
        migrated.settingsVersion = 9;
      }
      const retiredPalettes = { teal: "cyan", phosphor: "green", nightvision: "green" };
      this.settings.colorPalette = retiredPalettes[this.settings.colorPalette] || this.settings.colorPalette;
      const retiredGlyphSets = { restrictedEmojiTinted: "wingdings", fullEmojiTinted: "wingdings", geometric: "mosaic" };
      this.settings.glyphSet = retiredGlyphSets[this.settings.glyphSet] || this.settings.glyphSet;
      this.runtimeColumns = this.settings.columns;
      this.runtimeRows = this.settings.rows;
      this.runtimeFps = this.settings.fps;
      this.runtimeVectorSampleScale = this.settings.vectorSampleScale;
      if (Object.keys(migrated).length) await chrome.storage.local.set(migrated);
    }

    getFrameSettings() {
      return Core.resolveFrameSettings(this.settings);
    }

    toggle() {
      this.desiredActive = !this.desiredActive;
      window.clearTimeout(this.navigationRestartTimer);
      this.navigationRestartTimer = 0;
      return this.reconcileState();
    }

    reconcileState() {
      this.transitionPromise = this.transitionPromise
        .catch((error) => console.error("ANSI Tube transition failed.", error))
        .then(async () => {
          if (this.desiredActive) {
            if (!this.active) await this.start();
          } else if (this.active) {
            this.stop();
          }
        });
      return this.transitionPromise;
    }

    findVideo() {
      return [...document.querySelectorAll("video")]
        .filter((candidate) => candidate.videoWidth > 0 && candidate.videoHeight > 0)
        .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] || null;
    }

    findHost(video) {
      return video.closest("#movie_player, .html5-video-player") || video.parentElement;
    }

    isShorts() {
      return location.pathname.startsWith("/shorts/");
    }

    async waitForVideo(timeoutMilliseconds = 3000) {
      const deadline = performance.now() + timeoutMilliseconds;
      let video = this.findVideo();
      while (!video && this.desiredActive && performance.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        video = this.findVideo();
      }
      return video;
    }

    async start() {
      const startUrl = location.href;
      await this.loadSettings();
      if (!this.desiredActive || location.href !== startUrl) return;
      const video = await this.waitForVideo();
      if (!this.desiredActive || location.href !== startUrl) return;
      if (!video) {
        this.desiredActive = false;
        this.temporaryNotice("ANSI Tube could not find a ready YouTube video.");
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
      this.applyAudioEffects();
      this.raf = requestAnimationFrame(this.boundLoop);
    }

    stop({ preserveIntent = false } = {}) {
      if (!preserveIntent) this.desiredActive = false;
      this.bypassAudioGraph();
      this.active = false;
      cancelAnimationFrame(this.raf);
      this.canvas?.remove();
      this.scanlineOverlay?.remove();
      this.teardownPanelAutohide();
      this.effectsCanvas?.remove();
      this.cowCanvas?.remove();
      this.panel?.remove();
      this.host?.classList.remove("ansi-tube-host");
      this.canvas = null;
      this.scanlineOverlay = null;
      this.effectsCanvas = null;
      this.effectsContext = null;
      this.cowCanvas = null;
      this.cowContext = null;
      this.effectPrevious = null;
      this.effectCurrent = null;
      this.effectParticles.length = 0;
      this.effectHasHistory = false;
      this.cowState = null;
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
      this.scanlineOverlay = document.createElement("div");
      this.scanlineOverlay.className = "ansi-tube-scanlines";
      this.scanlineOverlay.hidden = !this.settings.scanlines;
      this.host.appendChild(this.scanlineOverlay);
      this.cowCanvas = document.createElement("canvas");
      this.cowCanvas.className = "ansi-tube-cow";
      this.cowCanvas.hidden = true;
      this.cowCanvas.setAttribute("aria-hidden", "true");
      this.cowContext = this.cowCanvas.getContext("2d", { alpha: true });
      this.host.appendChild(this.cowCanvas);
      this.effectsCanvas = document.createElement("canvas");
      this.effectsCanvas.className = "ansi-tube-effects";
      this.effectsCanvas.hidden = !this.settings.visualEffects;
      this.effectsCanvas.setAttribute("aria-hidden", "true");
      this.effectsContext = this.effectsCanvas.getContext("2d", { alpha: true });
      this.host.appendChild(this.effectsCanvas);
      this.rebuildGrid();
    }

    rebuildGrid() {
      if (!this.video || !this.canvas) return;
      const frame = this.getFrameSettings();
      const aspect = frame.aspect || this.video.videoWidth / this.video.videoHeight;
      const grid = this.settings.autoRows || frame.aspect
        ? Core.computeGrid(this.runtimeColumns, aspect)
        : { columns: this.runtimeColumns, rows: Math.max(10, Math.min(120, Math.round(this.runtimeRows))) };
      this.runtimeRows = grid.rows;
      const vectorScale = Math.max(2, Math.min(6, Number(this.runtimeVectorSampleScale) || 4));
      const sampleWidth = this.settings.glyphSet === "vectorLines" ? vectorScale : this.settings.glyphSet === "video64" ? 4 : 2;
      const sampleHeight = this.settings.glyphSet === "vectorLines" ? vectorScale : this.settings.glyphSet === "video64" ? 8 : 2;
      this.sampleCanvas.width = grid.columns * sampleWidth;
      this.sampleCanvas.height = grid.rows * sampleHeight;
      this.canvas.width = grid.columns * Core.CELL_WIDTH;
      this.canvas.height = grid.rows * Core.CELL_HEIGHT;
      this.context.imageSmoothingEnabled = false;
      this.buffers = Core.createBuffers(grid.columns, grid.rows);
      this.outputImage = new ImageData(this.buffers.image, this.canvas.width, this.canvas.height);
      if (this.effectsCanvas) {
        const effectAspect = this.canvas.width / this.canvas.height;
        const effectWidth = effectAspect >= 1 ? 384 : Math.max(160, Math.round(384 * effectAspect));
        const effectHeight = effectAspect >= 1 ? Math.max(108, Math.round(384 / effectAspect)) : 384;
        this.effectsCanvas.width = effectWidth;
        this.effectsCanvas.height = effectHeight;
        if (this.cowCanvas) {
          this.cowCanvas.width = effectWidth;
          this.cowCanvas.height = effectHeight;
          this.cowCanvas.hidden = true;
        }
        const effectRows = Math.max(12, Math.min(48, Math.round(32 / effectAspect)));
        this.effectPrevious = new Float32Array(32 * effectRows);
        this.effectCurrent = new Float32Array(32 * effectRows);
        this.effectParticles.length = 0;
        this.effectHasHistory = false;
        this.cowState = null;
        this.nextCowCheckAt = 0;
      }
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
        const frame = this.getFrameSettings();
        const sourceRect = Core.computeSourceRect(
          this.video.videoWidth,
          this.video.videoHeight,
          frame.squash ? null : frame.aspect,
          frame.zoom
        );
        this.sampleContext.drawImage(
          this.video,
          sourceRect.x,
          sourceRect.y,
          sourceRect.width,
          sourceRect.height,
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
        if (this.settings.glyphSet === "restrictAnsi" || this.settings.glyphSet === "video64") this.context.putImageData(this.outputImage, 0, 0);
        else if (this.settings.glyphSet === "vectorLines") this.renderVectorFrame(source.data);
        else this.renderTextFrame();
        if (this.settings.visualEffects) this.renderReactiveEffects(source.data, now);
        this.recordPerformance(performance.now() - started);
        if (this.performanceSamples.length === 1) this.setStatus("Live", "ok");
      } catch (error) {
        this.setStatus(
          error?.name === "SecurityError"
            ? "This video protects its pixels from browser-canvas access."
            : `Renderer paused: ${error?.message || "unknown error"}`,
          "error"
        );
        this.stop();
      }
    }

    renderTextFrame() {
      const set = Core.GLYPH_SETS[this.settings.glyphSet] || Core.GLYPH_SETS.restrictAnsi;
      const context = this.context;
      context.save();
      context.fillStyle = "#000";
      context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      context.textAlign = "center";
      context.textBaseline = "middle";
      const textFont = {
        chinese: '"Noto Sans CJK SC", "Noto Sans SC"',
        japanese: '"Noto Sans CJK JP", "Noto Sans JP"',
        korean: '"Noto Sans CJK KR", "Noto Sans KR"',
        wingdings: '"Noto Sans Symbols 2", "Noto Sans Symbols", "Segoe UI Symbol", Symbola'
      }[this.settings.glyphSet] || '"DejaVu Sans Mono", "Noto Sans Mono"';
      const cjk = ["chinese", "japanese", "korean"].includes(this.settings.glyphSet);
      context.font = set.type === "emoji"
        ? `${Core.CELL_HEIGHT - 1}px "Noto Color Emoji", "Segoe UI Emoji", sans-serif`
        : `${Core.CELL_HEIGHT - 2}px ${textFont}, monospace, sans-serif`;

      for (let row = 0; row < this.buffers.rows; row += 1) {
        for (let column = 0; column < this.buffers.columns; column += 1) {
          const cell = row * this.buffers.columns + column;
          const colorOffset = cell * 3;
          const r = this.buffers.colors[colorOffset];
          const g = this.buffers.colors[colorOffset + 1];
          const b = this.buffers.colors[colorOffset + 2];
          const x = column * Core.CELL_WIDTH + Core.CELL_WIDTH / 2;
          const y = row * Core.CELL_HEIGHT + Core.CELL_HEIGHT / 2;
          const glyph = Core.getGlyph(this.settings.glyphSet, this.buffers.glyphs[cell]);
          context.fillStyle = this.settings.colorPalette === "nativeglyph" ? "#fff" : `rgb(${r},${g},${b})`;
          if (cjk) context.fillText(glyph, x, y, Core.CELL_WIDTH - 1);
          else context.fillText(glyph, x, y);
        }
      }
      context.restore();
    }

    renderVectorFrame(source) {
      const context = this.context;
      const sampleWidth = this.sampleCanvas.width;
      const sampleHeight = this.sampleCanvas.height;
      const paletteBundle = Core.getPaletteBundle(this.settings.colorPalette, this.settings.paletteDepth);
      const palette = paletteBundle?.palette || [[0, 0, 0], [255, 255, 255]];
      const ordered = [...palette].sort((a, b) =>
        (a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114) -
        (b[0] * 0.299 + b[1] * 0.587 + b[2] * 0.114)
      );
      const invert = Boolean(this.settings.vectorInvert) && this.settings.colorPalette !== "nativeglyph";
      const background = invert ? ordered[ordered.length - 1] : ordered[0];
      const foreground = invert ? ordered[0] : ordered[ordered.length - 1];
      const inversePalette = new Map();
      if (invert && paletteBundle) {
        for (let index = 0; index < ordered.length; index += 1) {
          const color = ordered[index];
          inversePalette.set(color[0] << 16 | color[1] << 8 | color[2], ordered[ordered.length - 1 - index]);
        }
      }
      const field = Core.traceVectorField(source, sampleWidth, sampleHeight, {
        detail: this.settings.vectorEdgeDetail,
        reach: this.settings.vectorLineReach,
        points: this.settings.vectorPoints,
        blackThreshold: this.settings.blackThreshold
      });
      const scaleX = this.canvas.width / sampleWidth;
      const scaleY = this.canvas.height / sampleHeight;
      const segmentBuckets = new Map();
      const pointBuckets = new Map();
      const backgroundKey = background[0] << 16 | background[1] << 8 | background[2];

      const pointColor = (point) => {
        const offset = point.sampleIndex * 4;
        let color = Core.quantizeColor(
          this.settings.colorPalette,
          this.settings.paletteDepth,
          source[offset],
          source[offset + 1],
          source[offset + 2],
          this.settings
        );
        if (invert) {
          const key = color[0] << 16 | color[1] << 8 | color[2];
          color = inversePalette.get(key) || Core.invertLuminanceColor(color[0], color[1], color[2]);
        }
        const key = color[0] << 16 | color[1] << 8 | color[2];
        if (key === backgroundKey && ordered.length > 1) {
          color = ordered.length === 2
            ? foreground
            : ordered[Math.round((ordered.length - 1) * (invert ? 0.45 : 0.55))];
        }
        return color;
      };

      const bucketFor = (map, color) => {
        const key = color[0] << 16 | color[1] << 8 | color[2];
        let bucket = map.get(key);
        if (!bucket) {
          bucket = { color, coordinates: [] };
          map.set(key, bucket);
        }
        return bucket.coordinates;
      };

      for (const [startIndex, endIndex] of field.segments) {
        const start = field.points[startIndex];
        const end = field.points[endIndex];
        const color = pointColor(start.strength >= end.strength ? start : end);
        bucketFor(segmentBuckets, color).push(
          (start.x + 0.5) * scaleX,
          (start.y + 0.5) * scaleY,
          (end.x + 0.5) * scaleX,
          (end.y + 0.5) * scaleY
        );
      }

      if (this.settings.vectorPoints) {
        for (const point of field.points) {
          bucketFor(pointBuckets, pointColor(point)).push(
            (point.x + 0.5) * scaleX,
            (point.y + 0.5) * scaleY
          );
        }
      }

      context.save();
      context.fillStyle = `rgb(${background[0]},${background[1]},${background[2]})`;
      context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      context.lineWidth = Number(this.settings.vectorLineWidth) || 1.25;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.globalAlpha = 0.94;
      for (const { color, coordinates } of segmentBuckets.values()) {
        context.strokeStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
        context.beginPath();
        for (let index = 0; index < coordinates.length; index += 4) {
          context.moveTo(coordinates[index], coordinates[index + 1]);
          context.lineTo(coordinates[index + 2], coordinates[index + 3]);
        }
        context.stroke();
      }
      const pointSize = Number(this.settings.vectorPointSize) || 1.6;
      for (const { color, coordinates } of pointBuckets.values()) {
        context.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
        for (let index = 0; index < coordinates.length; index += 2) {
          context.fillRect(coordinates[index] - pointSize / 2, coordinates[index + 1] - pointSize / 2, pointSize, pointSize);
        }
      }
      context.restore();
    }

    renderReactiveEffects(source, now) {
      const canvas = this.effectsCanvas;
      const context = this.effectsContext;
      if (!canvas || !context) return;
      if (!this.settings.visualEffects) {
        canvas.hidden = true;
        context.clearRect(0, 0, canvas.width, canvas.height);
        this.effectParticles.length = 0;
        this.effectHasHistory = false;
        return;
      }
      canvas.hidden = false;
      const style = this.settings.effectStyle || "adaptive";
      const tuning = Core.getEffectTuning(this.settings.effectIntensity, style);
      const gridColumns = 32;
      const gridRows = Math.max(1, Math.round((this.effectCurrent?.length || 32) / gridColumns));
      if (!this.effectCurrent || !this.effectPrevious || this.effectCurrent.length !== gridColumns * gridRows) return;
      const current = this.effectCurrent;
      const previous = this.effectPrevious;
      const sampleWidth = this.sampleCanvas.width;
      const sampleHeight = this.sampleCanvas.height;

      for (let gy = 0; gy < gridRows; gy += 1) {
        const sourceY = Math.min(sampleHeight - 1, Math.floor((gy + 0.5) * sampleHeight / gridRows));
        for (let gx = 0; gx < gridColumns; gx += 1) {
          const sourceX = Math.min(sampleWidth - 1, Math.floor((gx + 0.5) * sampleWidth / gridColumns));
          const offset = (sourceY * sampleWidth + sourceX) * 4;
          current[gy * gridColumns + gx] = source[offset] * 0.2126 + source[offset + 1] * 0.7152 + source[offset + 2] * 0.0722;
        }
      }

      this.renderCowCameo(current, previous, gridColumns, gridRows, now, tuning);

      const hotspots = [];
      for (let gy = 1; gy < gridRows - 1; gy += 1) {
        for (let gx = 1; gx < gridColumns - 1; gx += 1) {
          const index = gy * gridColumns + gx;
          const value = current[index];
          const delta = this.effectHasHistory ? value - previous[index] : 0;
          const gradientX = current[index + 1] - current[index - 1];
          const gradientY = current[index + gridColumns] - current[index - gridColumns];
          const edge = Math.abs(gradientX) + Math.abs(gradientY);
          const brightSource = value >= tuning.hotspotLuminance && (delta >= tuning.hotspotDelta || edge >= tuning.hotspotEdge);
          const eventSource = this.effectHasHistory && value >= tuning.eventLuminance && delta >= tuning.eventDelta;
          if (!brightSource && !eventSource) continue;
          const sourceX = Math.min(sampleWidth - 1, Math.floor((gx + 0.5) * sampleWidth / gridColumns));
          const sourceY = Math.min(sampleHeight - 1, Math.floor((gy + 0.5) * sampleHeight / gridRows));
          const offset = (sourceY * sampleWidth + sourceX) * 4;
          hotspots.push({
            x: (gx + 0.5) * canvas.width / gridColumns,
            y: (gy + 0.5) * canvas.height / gridRows,
            gx,
            gy,
            value,
            delta,
            edge,
            brightSource,
            color: Core.quantizeColor(
              this.settings.colorPalette,
              this.settings.paletteDepth,
              source[offset], source[offset + 1], source[offset + 2],
              this.settings
            )
          });
        }
      }
      hotspots.sort((a, b) => (b.value + b.delta * 1.8 + b.edge * 0.25) - (a.value + a.delta * 1.8 + a.edge * 0.25));
      const eventHotspot = hotspots.find((hotspot) => hotspot.delta >= tuning.eventDelta);
      const auraHotspots = hotspots.filter((hotspot) => hotspot.brightSource).slice(0, tuning.maxAuras);

      context.save();
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = `rgba(0,0,0,${tuning.trailFade})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();

      if (style === "adaptive" || style === "auras") {
        context.save();
        context.globalCompositeOperation = "lighter";
        for (const hotspot of auraHotspots) {
          const radius = (18 + hotspot.value * 0.12) * tuning.radiusScale;
          const [r, g, b] = hotspot.color;
          const aura = context.createRadialGradient(hotspot.x, hotspot.y, 0, hotspot.x, hotspot.y, radius);
          aura.addColorStop(0, `rgba(${r},${g},${b},${tuning.auraOpacity})`);
          aura.addColorStop(0.35, `rgba(${r},${g},${b},${tuning.auraOpacity * 0.48})`);
          aura.addColorStop(1, `rgba(${r},${g},${b},0)`);
          context.fillStyle = aura;
          context.fillRect(hotspot.x - radius, hotspot.y - radius, radius * 2, radius * 2);
        }
        context.restore();
      }

      if (eventHotspot && (style === "adaptive" || style === "phosphor")) {
        const [r, g, b] = eventHotspot.color;
        const radius = 8 + Math.min(42, eventHotspot.delta * 0.22) * tuning.radiusScale;
        const afterimage = context.createRadialGradient(eventHotspot.x, eventHotspot.y, 0, eventHotspot.x, eventHotspot.y, radius);
        afterimage.addColorStop(0, `rgba(${r},${g},${b},${tuning.bloomOpacity})`);
        afterimage.addColorStop(0.25, `rgba(${r},${g},${b},${tuning.bloomOpacity * 0.52})`);
        afterimage.addColorStop(1, `rgba(${r},${g},${b},0)`);
        context.save();
        context.globalCompositeOperation = "lighter";
        context.fillStyle = afterimage;
        context.fillRect(eventHotspot.x - radius, eventHotspot.y - radius, radius * 2, radius * 2);
        context.restore();
      }
      if (eventHotspot && !this.reducedMotion && (style === "adaptive" || style === "auras")) {
        const [r, g, b] = eventHotspot.color;
        context.save();
        context.globalCompositeOperation = "lighter";
        context.strokeStyle = `rgba(${r},${g},${b},${tuning.rayOpacity})`;
        context.lineWidth = 0.8 + tuning.level * 0.9;
        const rayLength = Math.hypot(canvas.width, canvas.height);
        const rayCount = tuning.rayCount;
        for (let ray = 0; ray < rayCount; ray += 1) {
          const angle = ray / rayCount * Math.PI * 2 + now * 0.00017;
          context.beginPath();
          context.moveTo(eventHotspot.x, eventHotspot.y);
          context.lineTo(eventHotspot.x + Math.cos(angle) * rayLength, eventHotspot.y + Math.sin(angle) * rayLength);
          context.stroke();
        }
        context.restore();
      }

      if (style === "adaptive" || style === "outline") {
        const cellWidth = canvas.width / gridColumns;
        const cellHeight = canvas.height / gridRows;
        context.save();
        context.lineWidth = tuning.lineWidth;
        let outlined = 0;
        for (let gy = 1; gy < gridRows - 1 && outlined < tuning.maxOutlines; gy += 1) {
          for (let gx = 1; gx < gridColumns - 1 && outlined < tuning.maxOutlines; gx += 1) {
            const index = gy * gridColumns + gx;
            const gradientX = current[index + 1] - current[index - 1];
            const gradientY = current[index + gridColumns] - current[index - gridColumns];
            const edge = Math.hypot(gradientX, gradientY);
            if (edge < tuning.outlineEdge) continue;
            const length = Math.max(1, edge);
            const tangentX = -gradientY / length * cellWidth * 0.42;
            const tangentY = gradientX / length * cellHeight * 0.42;
            const x = (gx + 0.5) * cellWidth;
            const y = (gy + 0.5) * cellHeight;
            context.strokeStyle = current[index] > 154
              ? `rgba(0,0,0,${tuning.outlineDarkOpacity})`
              : `rgba(255,255,255,${tuning.outlineLightOpacity})`;
            context.beginPath();
            context.moveTo(x - tangentX, y - tangentY);
            context.lineTo(x + tangentX, y + tangentY);
            context.stroke();
            outlined += 1;
          }
        }
        context.restore();
      }

      if (eventHotspot && this.effectHasHistory && !this.reducedMotion) {
        const maximum = tuning.maxParticles;
        const spawnCount = Math.min(maximum - this.effectParticles.length, tuning.particleSpawn);
        for (let index = 0; index < spawnCount; index += 1) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.35 + Math.random() * (0.75 + tuning.level * 1.2);
          this.effectParticles.push({
            x: eventHotspot.x,
            y: eventHotspot.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.055 - tuning.level * 0.015 + Math.random() * 0.035,
            size: 0.8 + Math.random() * (1.1 + tuning.level * 1.6),
            color: eventHotspot.color
          });
        }
      }

      context.save();
      context.globalCompositeOperation = "lighter";
      const survivors = [];
      for (const particle of this.effectParticles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.life -= particle.decay;
        if (particle.life <= 0 || particle.x < -8 || particle.y < -8 || particle.x > canvas.width + 8 || particle.y > canvas.height + 8) continue;
        const [r, g, b] = particle.color;
        context.fillStyle = `rgba(${r},${g},${b},${particle.life * tuning.particleOpacity})`;
        const size = particle.size * (0.45 + particle.life);
        context.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
        survivors.push(particle);
      }
      context.restore();
      this.effectParticles = survivors;
      this.effectPrevious = current;
      this.effectCurrent = previous;
      this.effectHasHistory = true;
    }

    resetCowCameo(resetSchedule = false) {
      this.cowContext?.clearRect(0, 0, this.cowCanvas?.width || 0, this.cowCanvas?.height || 0);
      if (this.cowCanvas) this.cowCanvas.hidden = true;
      this.cowState = null;
      this.nextCowCheckAt = 0;
      if (resetSchedule) {
        this.nextCowEligibleAt = 0;
        this.cowForceAt = 0;
      }
    }

    renderCowCameo(current, previous, columns, rows, now, tuning) {
      const canvas = this.cowCanvas;
      const context = this.cowContext;
      const enabled = this.settings.cowCameo && this.settings.visualEffects;
      if (!canvas || !context || !enabled) {
        this.resetCowCameo();
        return;
      }
      this.ensureCowImage();
      if (this.cowImageState !== "ready") {
        canvas.hidden = true;
        return;
      }

      if (!this.nextCowEligibleAt || !this.cowForceAt) {
        const timing = Core.getCowTiming(now, true, Math.random());
        this.nextCowEligibleAt = timing.eligibleAt;
        this.cowForceAt = timing.forceAt;
      }

      if (!this.cowState && now >= this.nextCowCheckAt) {
        this.nextCowCheckAt = Math.min(now + 1800 + Math.random() * 1200, this.cowForceAt);
        if (this.effectHasHistory && now >= this.nextCowEligibleAt) {
          let luminanceTotal = 0;
          let motionTotal = 0;
          let edgeTotal = 0;
          for (let y = 1; y < rows - 1; y += 1) {
            for (let x = 1; x < columns - 1; x += 1) {
              const index = y * columns + x;
              luminanceTotal += current[index];
              motionTotal += Math.abs(current[index] - previous[index]);
              edgeTotal += Math.abs(current[index + 1] - current[index - 1]) + Math.abs(current[index + columns] - current[index - columns]);
            }
          }
          const samples = Math.max(1, (columns - 2) * (rows - 2));
          const mean = luminanceTotal / samples;
          const motion = motionTotal / samples;
          const edge = edgeTotal / samples;
          const dramaticallyDue = now >= this.cowForceAt;
          const visuallyPlausible = Core.isCowMoment({ mean, motion, edge });
          if (dramaticallyDue || (visuallyPlausible && Math.random() < 0.38)) {
            const placement = this.findQuietCowPlacement(current, columns, rows);
            this.cowState = {
              startedAt: now,
              duration: 8500 + Math.random() * 2000,
              x: placement.x,
              y: placement.y,
              mirror: placement.x > 0.5,
              scale: 0.78 + Math.random() * 0.22
            };
            const timing = Core.getCowTiming(now, false, Math.random());
            this.nextCowEligibleAt = timing.eligibleAt;
            this.cowForceAt = timing.forceAt;
            this.playCowMoo(placement.x).catch(() => {});
          }
        }
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      if (!this.cowState) {
        canvas.hidden = true;
        return;
      }

      const elapsed = now - this.cowState.startedAt;
      if (elapsed >= this.cowState.duration) {
        this.cowState = null;
        canvas.hidden = true;
        return;
      }
      const fadeIn = Math.min(1, elapsed / 2200);
      const fadeOut = Math.min(1, (this.cowState.duration - elapsed) / 2600);
      const alpha = Math.min(fadeIn, fadeOut) * (0.16 + (tuning?.level || 0.12) * 0.14);
      canvas.hidden = false;
      this.drawCowImage(context, canvas.width * this.cowState.x, canvas.height * this.cowState.y, this.cowState.scale, alpha, this.cowState.mirror);
    }

    findQuietCowPlacement(values, columns, rows) {
      const candidates = [0.18, 0.5, 0.82];
      let best = { x: candidates[0], y: 0.74, score: Infinity };
      for (const normalizedX of candidates) {
        const centerX = Math.round(normalizedX * (columns - 1));
        const centerY = Math.round(rows * 0.68);
        let score = 0;
        let samples = 0;
        for (let y = Math.max(1, centerY - 3); y <= Math.min(rows - 2, centerY + 3); y += 1) {
          for (let x = Math.max(1, centerX - 4); x <= Math.min(columns - 2, centerX + 4); x += 1) {
            const index = y * columns + x;
            score += Math.abs(values[index + 1] - values[index - 1]) + Math.abs(values[index + columns] - values[index - columns]);
            samples += 1;
          }
        }
        score /= Math.max(1, samples);
        if (score < best.score) best = { x: normalizedX, y: 0.74, score };
      }
      return best;
    }

    ensureCowImage() {
      if (this.cowImageState !== "idle") return;
      this.cowImageState = "loading";
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.onload = () => {
        this.cowImage = image;
        this.cowImageState = "ready";
      };
      image.onerror = () => {
        this.cowImage = null;
        this.cowImageState = "error";
      };
      image.src = chrome.runtime.getURL("assets/cow-blond.png");
    }

    drawCowImage(context, x, y, scale, alpha, mirror) {
      if (!this.cowImage) return;
      const size = Math.min(context.canvas.width * 0.38, context.canvas.height * 0.68) * scale;
      context.save();
      context.translate(x, y);
      context.scale(mirror ? -1 : 1, 1);
      context.globalAlpha = alpha;
      context.globalCompositeOperation = "screen";
      context.drawImage(this.cowImage, -size / 2, -size / 2, size, size);
      context.restore();
    }

    async prepareCowAudio() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!this.cowAudioContext || this.cowAudioContext.state === "closed") this.cowAudioContext = new AudioContextClass();
      if (this.cowAudioContext.state === "suspended") await this.cowAudioContext.resume();
      return this.cowAudioContext.state === "running" ? this.cowAudioContext : null;
    }

    async playCowMoo(horizontalPosition = 0.5) {
      if (!this.video || this.video.muted || this.video.volume <= 0 || this.settings.cowVolume <= 0) return false;
      const context = await this.prepareCowAudio();
      if (!context) return false;
      const now = context.currentTime;
      const duration = 2.25;
      const master = context.createGain();
      const voice = context.createOscillator();
      const harmonic = context.createOscillator();
      const overtone = context.createOscillator();
      const voiceGain = context.createGain();
      const harmonicGain = context.createGain();
      const overtoneGain = context.createGain();
      const formantLow = context.createBiquadFilter();
      const formantHigh = context.createBiquadFilter();
      const lowpass = context.createBiquadFilter();
      const vibrato = context.createOscillator();
      const vibratoDepth = context.createGain();
      const panner = context.createStereoPanner?.();

      voice.type = "sawtooth";
      harmonic.type = "triangle";
      overtone.type = "sine";
      voice.frequency.setValueAtTime(108, now);
      voice.frequency.exponentialRampToValueAtTime(84, now + 0.66);
      voice.frequency.linearRampToValueAtTime(92, now + 1.22);
      voice.frequency.exponentialRampToValueAtTime(76, now + duration);
      harmonic.frequency.setValueAtTime(216, now);
      harmonic.frequency.exponentialRampToValueAtTime(168, now + 0.66);
      harmonic.frequency.linearRampToValueAtTime(184, now + 1.22);
      harmonic.frequency.exponentialRampToValueAtTime(152, now + duration);
      overtone.frequency.setValueAtTime(324, now);
      overtone.frequency.exponentialRampToValueAtTime(252, now + 0.66);
      overtone.frequency.linearRampToValueAtTime(276, now + 1.22);
      overtone.frequency.exponentialRampToValueAtTime(228, now + duration);
      voiceGain.gain.value = 0.62;
      harmonicGain.gain.value = 0.30;
      overtoneGain.gain.value = 0.12;
      formantLow.type = "peaking";
      formantLow.frequency.value = 280;
      formantLow.Q.value = 1.1;
      formantLow.gain.value = 10;
      formantHigh.type = "peaking";
      formantHigh.frequency.value = 560;
      formantHigh.Q.value = 1.4;
      formantHigh.gain.value = 7;
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1100;
      lowpass.Q.value = 0.7;
      vibrato.frequency.value = 4.6;
      vibratoDepth.gain.value = 2.8;
      const cowVolume = Math.max(0, Math.min(1, Number(this.settings.cowVolume) || 0));
      const peak = Math.min(0.13, (0.04 + this.video.volume * 0.09) * cowVolume);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(peak, now + 0.18);
      master.gain.setValueAtTime(peak * 0.88, now + 1.05);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      voice.connect(voiceGain).connect(formantLow);
      harmonic.connect(harmonicGain).connect(formantLow);
      overtone.connect(overtoneGain).connect(formantLow);
      formantLow.connect(formantHigh).connect(lowpass).connect(master);
      vibrato.connect(vibratoDepth);
      vibratoDepth.connect(voice.frequency);
      vibratoDepth.connect(harmonic.frequency);
      vibratoDepth.connect(overtone.frequency);
      if (panner) {
        panner.pan.value = Math.max(-0.6, Math.min(0.6, (horizontalPosition - 0.5) * 1.2));
        master.connect(panner).connect(context.destination);
      } else {
        master.connect(context.destination);
      }
      voice.start(now);
      harmonic.start(now);
      overtone.start(now);
      vibrato.start(now);
      voice.stop(now + duration);
      harmonic.stop(now + duration);
      overtone.stop(now + duration);
      vibrato.stop(now + duration);
      return true;
    }

    recordPerformance(milliseconds) {
      this.performanceSamples.push(milliseconds);
      if (this.performanceSamples.length > 24) this.performanceSamples.shift();
      if (!this.settings.adaptive || this.performanceSamples.length < 24) return;

      const average = this.performanceSamples.reduce((sum, value) => sum + value, 0) / this.performanceSamples.length;
      const budget = 1000 / this.runtimeFps;
      if (average < budget * 0.82) return;

      if (this.settings.glyphSet === "vectorLines" && this.runtimeVectorSampleScale > 2) {
        const steps = [2, 3, 4, 6];
        this.runtimeVectorSampleScale = [...steps].reverse().find((value) => value < this.runtimeVectorSampleScale) || 2;
        this.rebuildGrid();
      } else if (this.runtimeFps > 12) {
        const steps = [30, 24, 20, 15, 12];
        const lower = [...steps].reverse().find((value) => value < this.runtimeFps);
        this.runtimeFps = lower || 12;
      } else if (this.runtimeColumns > 80) {
        const scale = Math.max(80, Math.round(this.runtimeColumns * 0.8 / 4) * 4) / this.runtimeColumns;
        this.runtimeColumns = Math.max(80, Math.round(this.runtimeColumns * 0.8 / 4) * 4);
        if (!this.settings.autoRows) this.runtimeRows = Math.max(10, Math.round(this.runtimeRows * scale));
        this.rebuildGrid();
      }
      this.performanceSamples.length = 0;
      this.setStatus(`Adaptive mode: ${this.runtimeColumns}×${this.runtimeRows} · ${this.runtimeFps} FPS`, "ok");
      this.updateRuntimeLabels();
    }

    createPanel() {
      this.panel?.remove();
      const panel = document.createElement("section");
      panel.className = "ansi-tube-panel";
      panel.dataset.collapsed = String(Boolean(this.settings.panelCollapsed));
      panel.dataset.shorts = String(this.isShorts());
      panel.dataset.idle = "false";
      panel.setAttribute("aria-label", "ANSI Tube controls");
      panel.innerHTML = `
        <div class="ansi-tube-heading">
          <span class="ansi-tube-brand">ANSI TUBE <small>v0.9.6</small></span>
          <div class="ansi-tube-heading-actions">
            <button type="button" data-action="collapse" aria-label="${this.settings.panelCollapsed ? "Expand" : "Collapse"} controls" aria-expanded="${String(!this.settings.panelCollapsed)}" title="${this.settings.panelCollapsed ? "Expand" : "Collapse"} controls">${this.settings.panelCollapsed ? "+" : "−"}</button>
            <button type="button" data-action="close" aria-label="Exit ANSI Tube" title="Exit ANSI Tube">×</button>
          </div>
        </div>
        <div class="ansi-tube-controls">
          <details class="ansi-tube-section" open>
            <summary>Frame &amp; performance</summary>
            <div class="ansi-tube-section-body">
              <div class="ansi-tube-row"><label for="ansi-tube-preset">Preset</label><select id="ansi-tube-preset" data-setting="preset"><option value="potato">Potato</option><option value="balanced">Balanced</option><option value="deluxe">Deluxe</option><option value="custom">Custom</option></select></div>
              <div class="ansi-tube-row"><label for="ansi-tube-columns">Columns</label><input id="ansi-tube-columns" data-setting="columns" type="range" min="60" max="200" step="4"><span class="ansi-tube-value" data-value="columns"></span></div>
              <div class="ansi-tube-row"><label for="ansi-tube-rows">Rows</label><input id="ansi-tube-rows" data-setting="rows" type="range" min="10" max="120" step="2"><span class="ansi-tube-value" data-value="rows"></span></div>
              <label class="ansi-tube-row ansi-tube-check"><input data-setting="autoRows" type="checkbox">Keep source aspect ratio</label>
              <fieldset class="ansi-tube-frame-options"><legend>4:3 framing</legend><div class="ansi-tube-check-grid"><label><input data-setting="crop43" type="checkbox">Crop</label><label><input data-setting="zoom43" type="checkbox">Zoom</label><label><input data-setting="squash43" type="checkbox">Squash</label></div></fieldset>
              <fieldset class="ansi-tube-frame-options"><legend>1:1 framing</legend><div class="ansi-tube-check-grid"><label><input data-setting="crop11" type="checkbox">Crop</label><label><input data-setting="zoom11" type="checkbox">Zoom</label><label><input data-setting="squash11" type="checkbox">Squash</label></div></fieldset>
              <div class="ansi-tube-row"><label for="ansi-tube-fps">ANSI FPS</label><input id="ansi-tube-fps" data-setting="fps" type="range" min="8" max="30" step="1"><span class="ansi-tube-value" data-value="fps"></span></div>
              <label class="ansi-tube-row ansi-tube-check"><input data-setting="adaptive" type="checkbox">Adapt on slower hardware</label>
            </div>
          </details>

          <details class="ansi-tube-section" open>
            <summary>Look &amp; glyphs</summary>
            <div class="ansi-tube-section-body">
              <div class="ansi-tube-row"><label for="ansi-tube-palette">Palette</label><select id="ansi-tube-palette" data-setting="colorPalette">
                <optgroup label="Core"><option value="standard">Standard</option><option value="nativeglyph">Native Glyph</option><option value="cga">CGA</option><option value="ega">EGA</option><option value="vga">VGA</option><option value="svga">SVGA</option></optgroup>
                <optgroup label="Burst Family"><option value="sunburst">Sunburst</option><option value="moonburst">Moonburst</option><option value="mooburst">MooBurst🐄</option><option value="ruby">Ruby</option><option value="enchantedforest">Enchanted Forest</option><option value="nightburst">Nightburst</option><option value="snowburst">Snowburst</option><option value="cyberburst">Cyberburst</option><option value="grapeburst">Grapeburst</option><option value="candyburst">Candyburst</option><option value="chromaburst">Chromaburst</option><option value="soulburst">Soulburst</option></optgroup>
                <optgroup label="Monochrome"><option value="blackwhite">Black &amp; White</option><option value="cyan">Cyan</option><option value="yellow">Yellow</option><option value="green">Green</option><option value="red">Red</option><option value="purple">Purple</option><option value="blue">Blue</option><option value="pink">Pink</option><option value="orange">Orange</option><option value="amber">Amber</option><option value="ice">Ice</option><option value="toxic">Toxic</option><option value="sepia">Sepia</option></optgroup>
                <optgroup label="Old Hardware"><option value="nes">NES</option><option value="sms">SMS</option><option value="genesis">Genesis</option><option value="c64">C64</option><option value="apple2e">Apple IIe</option><option value="apple2green">Apple II Mono Green</option><option value="gbdmg">GB DMG</option><option value="virtualb">Virtual B</option><option value="snes">SNES</option><option value="vexitrexi">Vexi Trexi</option><option value="zedexspectral">S Zed Ex Spectral</option><option value="atari2600">Atari 2600</option><option value="atari5200">Atari 5200</option><option value="trash80">Trash 80</option></optgroup>
                <optgroup label="Creative"><option value="oldtv">Old TV</option><option value="eighties">1980s</option><option value="space">Space</option><option value="psychedelic">Psychedelic</option><option value="caveman">Caveman</option><option value="oceania">Oceania</option><option value="metallics">Metallics</option><option value="silvergold">Silver and Gold</option><option value="supercomic">Super Comic</option><option value="hyperreal">Hyper Real</option></optgroup>
              </select></div>
              <div class="ansi-tube-row"><label for="ansi-tube-depth">Palette depth</label><select id="ansi-tube-depth" data-setting="paletteDepth"><option value="2">2 colors</option><option value="3">3 colors</option><option value="4">4 colors</option><option value="6">6 colors</option><option value="8">8 colors</option><option value="12">12 colors</option><option value="16">16 colors</option><option value="24">24 colors</option><option value="32">32 colors</option><option value="48">48 colors</option><option value="64">64 colors</option><option value="96">96 colors</option><option value="128">128 colors</option><option value="256">256 colors</option><option value="truecolor">True Color</option></select></div>
              <div class="ansi-tube-row"><label for="ansi-tube-glyphs">Glyph set</label><select id="ansi-tube-glyphs" data-setting="glyphSet">
                <optgroup label="Video optimized"><option value="restrictAnsi">Optimized ANSI</option><option value="video64">Video 64 · Homebrew</option><option value="mosaic">Mosaic Blocks</option><option value="vectorLines">Vector Lines</option></optgroup>
                <optgroup label="Text &amp; symbols"><option value="fullAnsi">Full ANSI</option><option value="restrictedAscii">Optimized ASCII</option><option value="fullAscii">Full ASCII</option><option value="binary">Binary</option><option value="wingdings">Wingdings</option><option value="chinese">Chinese</option><option value="japanese">Japanese</option><option value="korean">Korean</option><option value="braille">Braille</option></optgroup>
                <optgroup label="Emoji"><option value="restrictedEmoji">Optimized Emoji · Native</option><option value="fullEmoji">Full Emoji · Native</option></optgroup>
              </select></div>
              <div class="ansi-tube-hint" data-emoji-hint role="note" hidden></div>
              <div class="ansi-tube-subcontrols" data-vector-controls hidden>
                <div class="ansi-tube-row"><label for="ansi-tube-vector-sampling">Sampling</label><select id="ansi-tube-vector-sampling" data-setting="vectorSampleScale"><option value="2">Fast · 2×</option><option value="3">Detailed · 3×</option><option value="4">High · 4×</option><option value="6">Ultra · 6×</option></select></div>
                <div class="ansi-tube-row"><label for="ansi-tube-vector-detail">Edge detail</label><input id="ansi-tube-vector-detail" data-setting="vectorEdgeDetail" type="range" min="0" max="1" step="0.02"><span class="ansi-tube-value" data-value="vectorEdgeDetail"></span></div>
                <div class="ansi-tube-row"><label for="ansi-tube-vector-reach">Line reach</label><input id="ansi-tube-vector-reach" data-setting="vectorLineReach" type="range" min="1" max="10" step="1"><span class="ansi-tube-value" data-value="vectorLineReach"></span></div>
                <div class="ansi-tube-row"><label for="ansi-tube-vector-width">Line width</label><input id="ansi-tube-vector-width" data-setting="vectorLineWidth" type="range" min="0.5" max="3" step="0.25"><span class="ansi-tube-value" data-value="vectorLineWidth"></span></div>
                <div class="ansi-tube-row"><label for="ansi-tube-vector-point-size">Point size</label><input id="ansi-tube-vector-point-size" data-setting="vectorPointSize" type="range" min="0.5" max="4" step="0.25"><span class="ansi-tube-value" data-value="vectorPointSize"></span></div>
                <label class="ansi-tube-row ansi-tube-check"><input data-setting="vectorPoints" type="checkbox">Pointillist nodes</label><label class="ansi-tube-row ansi-tube-check"><input data-setting="vectorInvert" type="checkbox">Invert light / dark</label>
              </div>
              <div class="ansi-tube-subcontrols" data-video-glyph-controls hidden><div class="ansi-tube-row"><label for="ansi-tube-video-stability">Temporal stability</label><input id="ansi-tube-video-stability" data-setting="videoGlyphStability" type="range" min="0" max="1" step="0.02"><span class="ansi-tube-value" data-value="videoGlyphStability"></span></div></div>
              <div class="ansi-tube-row"><label for="ansi-tube-color">Color boost</label><input id="ansi-tube-color" data-setting="saturationBoost" type="range" min="0" max="0.8" step="0.02"><span class="ansi-tube-value" data-value="saturationBoost"></span></div>
              <div class="ansi-tube-row"><label for="ansi-tube-brightness">Brightness</label><input id="ansi-tube-brightness" data-setting="brightnessBoost" type="range" min="0" max="0.5" step="0.01"><span class="ansi-tube-value" data-value="brightnessBoost"></span></div>
              <div class="ansi-tube-row"><label for="ansi-tube-black">Black floor</label><input id="ansi-tube-black" data-setting="blackThreshold" type="range" min="0" max="0.15" step="0.005"><span class="ansi-tube-value" data-value="blackThreshold"></span></div>
              <div class="ansi-tube-row"><label for="ansi-tube-opacity">ANSI mix</label><input id="ansi-tube-opacity" data-setting="opacity" type="range" min="0" max="1" step="0.05"><span class="ansi-tube-value" data-value="opacity"></span></div>
            </div>
          </details>

          <details class="ansi-tube-section">
            <summary>Reactive effects</summary>
            <div class="ansi-tube-section-body">
              <label class="ansi-tube-row ansi-tube-check"><input data-setting="visualEffects" type="checkbox">Enable video-reactive effects</label>
              <div class="ansi-tube-row"><label for="ansi-tube-effect-style">Effect style</label><select id="ansi-tube-effect-style" data-setting="effectStyle"><option value="adaptive">Adaptive mix</option><option value="phosphor">Phosphor trails</option><option value="auras">Auras + god rays</option><option value="outline">Radiant outlines</option></select></div>
              <div class="ansi-tube-row"><label for="ansi-tube-effect-intensity">Intensity</label><input id="ansi-tube-effect-intensity" data-setting="effectIntensity" type="range" min="0" max="1" step="0.02"><span class="ansi-tube-value" data-value="effectIntensity"></span></div>
              <div class="ansi-tube-subcontrols ansi-tube-cow-controls" data-cow-controls hidden>
                <label class="ansi-tube-row ansi-tube-check"><input data-setting="cowCameo" type="checkbox">Blond cow cameos + moo 🐄</label>
                <div class="ansi-tube-row"><label for="ansi-tube-cow-volume">Moo volume</label><input id="ansi-tube-cow-volume" data-setting="cowVolume" type="range" min="0" max="1" step="0.05"><span class="ansi-tube-value" data-value="cowVolume"></span></div>
                <div class="ansi-tube-actions ansi-tube-cow-actions"><button type="button" data-action="test-moo">Test moo</button></div>
                <p class="ansi-tube-help">Fades in a realistic, flowing-haired cow at suitably moo-dramatic moments. The first appearance arrives within about 22 seconds; later cameos recur without spamming.</p>
              </div>
              <label class="ansi-tube-row ansi-tube-check"><input data-setting="scanlines" type="checkbox">CRT scanlines</label>
              <p class="ansi-tube-help">Each effect has its own trigger and strength curve: auras follow bright sources, phosphor and particles follow motion/events, and outlines follow edges. Reduced-motion systems keep only static auras and outlines.</p>
            </div>
          </details>

          <details class="ansi-tube-section">
            <summary>Audio</summary>
            <div class="ansi-tube-section-body">
              <label class="ansi-tube-row ansi-tube-check"><input data-setting="wowFlutter" type="checkbox">Wow + flutter</label>
              <div class="ansi-tube-row"><label for="ansi-tube-bitcrush">Bit crush</label><select id="ansi-tube-bitcrush" data-setting="bitCrushMode"><option value="off">Off</option><option value="bit1">Bit Crush 1 · gated</option><option value="bit2">Bit Crush 2 · radio</option></select></div>
              <div class="ansi-tube-row"><label for="ansi-tube-pitch">Pitch shift</label><input id="ansi-tube-pitch" data-setting="pitchShift" type="range" min="-4" max="4" step="1"><span class="ansi-tube-value" data-value="pitchShift"></span></div>
              <div class="ansi-tube-row"><label for="ansi-tube-filter">Audio filter</label><select id="ansi-tube-filter" data-setting="audioFilter"><option value="off">Off</option><option value="am">AM Radio</option><option value="telephone">Telephone</option><option value="underwater">Underwater</option></select></div>
              <div class="ansi-tube-row"><label for="ansi-tube-audio-mix">Audio mix</label><input id="ansi-tube-audio-mix" data-setting="audioMix" type="range" min="0" max="1" step="0.05"><span class="ansi-tube-value" data-value="audioMix"></span></div>
            </div>
          </details>

          <div class="ansi-tube-actions">
            <button type="button" data-action="png">Save PNG</button>
            <button type="button" data-action="ans">Save .ANS</button>
          </div>
          <div class="ansi-tube-status" role="status" aria-live="polite"></div>
        </div>
      `;
      this.host.appendChild(panel);
      this.panel = panel;
      this.syncControls();
      panel.addEventListener("click", (event) => this.handlePanelClick(event));
      panel.addEventListener("input", (event) => this.handleSettingInput(event));
      panel.addEventListener("change", (event) => this.handleSettingInput(event));
      this.setupPanelAutohide();
    }

    setupPanelAutohide() {
      this.teardownPanelAutohide();
      if (!this.host || !this.panel) return;
      this.host.addEventListener("pointermove", this.boundPanelActivity, { passive: true });
      this.host.addEventListener("pointerdown", this.boundPanelActivity, { passive: true });
      this.panel.addEventListener("pointerenter", this.boundPanelActivity, { passive: true });
      this.panel.addEventListener("pointerleave", this.boundPanelLeave, { passive: true });
      this.panel.addEventListener("focusin", this.boundPanelActivity);
      this.revealCollapsedPanel();
    }

    teardownPanelAutohide() {
      window.clearTimeout(this.panelIdleTimer);
      this.panelIdleTimer = 0;
      this.host?.removeEventListener("pointermove", this.boundPanelActivity);
      this.host?.removeEventListener("pointerdown", this.boundPanelActivity);
      this.panel?.removeEventListener("pointerenter", this.boundPanelActivity);
      this.panel?.removeEventListener("pointerleave", this.boundPanelLeave);
      this.panel?.removeEventListener("focusin", this.boundPanelActivity);
    }

    revealCollapsedPanel() {
      if (!this.panel) return;
      window.clearTimeout(this.panelIdleTimer);
      this.panelIdleTimer = 0;
      this.panel.dataset.idle = "false";
      this.scheduleCollapsedPanelFade();
    }

    scheduleCollapsedPanelFade() {
      window.clearTimeout(this.panelIdleTimer);
      this.panelIdleTimer = 0;
      if (!this.panel || !this.settings.panelCollapsed) {
        if (this.panel) this.panel.dataset.idle = "false";
        return;
      }
      this.panelIdleTimer = window.setTimeout(() => {
        this.panelIdleTimer = 0;
        if (!this.panel || !this.settings.panelCollapsed) return;
        if (this.panel.matches(":hover") || this.panel.contains(document.activeElement)) {
          this.scheduleCollapsedPanelFade();
          return;
        }
        this.panel.dataset.idle = "true";
      }, 2200);
    }

    syncControls() {
      if (!this.panel) return;
      this.panel.dataset.collapsed = String(Boolean(this.settings.panelCollapsed));
      this.panel.dataset.shorts = String(this.isShorts());
      const collapseButton = this.panel.querySelector('[data-action="collapse"]');
      if (collapseButton) {
        const collapsed = Boolean(this.settings.panelCollapsed);
        collapseButton.textContent = collapsed ? "+" : "−";
        collapseButton.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} controls`);
        collapseButton.setAttribute("aria-expanded", String(!collapsed));
        collapseButton.title = `${collapsed ? "Expand" : "Collapse"} controls`;
      }
      for (const input of this.panel.querySelectorAll("[data-setting]")) {
        const key = input.dataset.setting;
        if (input.type === "checkbox") input.checked = Boolean(this.settings[key]);
        else input.value = this.settings[key];
      }
      const rows = this.panel.querySelector('[data-setting="rows"]');
      if (rows) this.setControlDisabled(rows, this.settings.autoRows || Boolean(this.getFrameSettings().aspect));
      const glyphSet = Core.GLYPH_SETS[this.settings.glyphSet] || Core.GLYPH_SETS.restrictAnsi;
      const nativeEmoji = glyphSet.type === "emoji" && glyphSet.nativeColor;
      const vectorLines = glyphSet.type === "vector";
      const videoGlyphs = glyphSet.type === "bitmap";
      const palette = this.panel.querySelector('[data-setting="colorPalette"]');
      const depth = this.panel.querySelector('[data-setting="paletteDepth"]');
      this.setControlDisabled(palette, nativeEmoji);
      this.setControlDisabled(depth, nativeEmoji);
      this.setControlDisabled(this.panel.querySelector('[data-action="ans"]'), vectorLines || videoGlyphs);
      this.setControlDisabled(this.panel.querySelector('[data-setting="vectorInvert"]'), vectorLines && this.settings.colorPalette === "nativeglyph");
      this.setControlDisabled(this.panel.querySelector('[data-setting="effectStyle"]'), !this.settings.visualEffects);
      this.setControlDisabled(this.panel.querySelector('[data-setting="effectIntensity"]'), !this.settings.visualEffects);
      const mooBurstActive = this.settings.colorPalette === "mooburst";
      const cowControlsUnlocked = mooBurstActive || this.settings.cowCameo;
      const cowControls = this.panel.querySelector("[data-cow-controls]");
      if (cowControls) {
        cowControls.hidden = !cowControlsUnlocked;
        cowControls.toggleAttribute("hidden", !cowControlsUnlocked);
        cowControls.setAttribute("aria-hidden", String(!cowControlsUnlocked));
      }
      this.setControlDisabled(this.panel.querySelector('[data-setting="cowCameo"]'), !this.settings.visualEffects);
      const cowAudioDisabled = !this.settings.visualEffects || !this.settings.cowCameo;
      this.setControlDisabled(this.panel.querySelector('[data-setting="cowVolume"]'), cowAudioDisabled);
      this.setControlDisabled(this.panel.querySelector('[data-action="test-moo"]'), cowAudioDisabled);
      const vectorControls = this.panel.querySelector("[data-vector-controls]");
      if (vectorControls) vectorControls.hidden = !vectorLines;
      const videoGlyphControls = this.panel.querySelector("[data-video-glyph-controls]");
      if (videoGlyphControls) videoGlyphControls.hidden = !videoGlyphs;
      const hint = this.panel.querySelector("[data-emoji-hint]");
      if (hint) {
        const cjk = ["chinese", "japanese", "korean"].includes(this.settings.glyphSet);
        hint.hidden = glyphSet.type !== "emoji" && !cjk && !vectorLines && !videoGlyphs;
        hint.textContent = vectorLines
          ? `Palette depth controls Vector Lines from 2-color contours through True Color.${this.settings.colorPalette === "nativeglyph" ? " Light/dark inversion is unavailable for Native Glyph." : " Light/dark inversion reverses the palette’s tonal hierarchy."}`
          : videoGlyphs
            ? "An original 64-shape 8×16 atlas matches contours, masses, curves, and compact facial cues with temporal stabilization. PNG is the canonical export."
          : cjk
            ? "CJK shapes are fitted inside each ANSI cell using your installed Noto/system fonts."
            : "Native emoji keep the font’s built-in colors; palette and depth are unavailable.";
      }
      this.updateRuntimeLabels();
    }

    setControlDisabled(control, disabled) {
      if (!control) return;
      control.disabled = Boolean(disabled);
      control.toggleAttribute("disabled", Boolean(disabled));
      control.setAttribute("aria-disabled", String(Boolean(disabled)));
      control.classList.toggle("ansi-tube-disabled", Boolean(disabled));
    }

    updateRuntimeLabels() {
      if (!this.panel) return;
      const formats = {
        columns: () => String(this.runtimeColumns),
        rows: () => this.getFrameSettings().aspect
          ? `${this.getFrameSettings().label} ${this.runtimeRows}`
          : this.settings.autoRows ? `Auto ${this.runtimeRows}` : String(this.runtimeRows),
        fps: () => String(this.runtimeFps),
        saturationBoost: () => `${Math.round(this.settings.saturationBoost * 100)}%`,
        brightnessBoost: () => `${Math.round(this.settings.brightnessBoost * 100)}%`,
        blackThreshold: () => this.settings.blackThreshold.toFixed(3),
        opacity: () => `${Math.round(this.settings.opacity * 100)}%`,
        vectorEdgeDetail: () => `${Math.round(this.settings.vectorEdgeDetail * 100)}%`,
        vectorLineReach: () => String(this.settings.vectorLineReach),
        vectorLineWidth: () => Number(this.settings.vectorLineWidth).toFixed(2),
        vectorPointSize: () => Number(this.settings.vectorPointSize).toFixed(2),
        videoGlyphStability: () => `${Math.round(this.settings.videoGlyphStability * 100)}%`,
        effectIntensity: () => `${Math.round(this.settings.effectIntensity * 100)}%`,
        cowVolume: () => `${Math.round(this.settings.cowVolume * 100)}%`,
        pitchShift: () => this.settings.pitchShift === 0 ? "Off" : `${this.settings.pitchShift > 0 ? "+" : ""}${this.settings.pitchShift} st`,
        audioMix: () => `${Math.round(this.settings.audioMix * 100)}%`
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
        this.settings.panelCollapsed = !this.settings.panelCollapsed;
        this.sessionPanelCollapsed = this.settings.panelCollapsed;
        chrome.storage.local.set({ panelCollapsed: this.settings.panelCollapsed });
        this.syncControls();
        this.revealCollapsedPanel();
      }
      if (action === "png") this.exportPng();
      if (action === "ans") this.exportAns();
      if (action === "test-moo") {
        this.playCowMoo(0.5)
          .then((played) => this.setStatus(
            played ? "Moo test played." : "Moo test blocked — unmute YouTube and raise both volume controls.",
            played ? "ok" : "error"
          ))
          .catch(() => this.setStatus("Moo test could not start in this browser.", "error"));
      }
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
        const numericSelect = key === "vectorSampleScale" || (key === "paletteDepth" && input.value !== "truecolor");
        this.settings[key] = numericSelect ? Number(input.value) : input.value;
        this.settings.preset = "custom";
      }

      const fourThreeKeys = ["crop43", "zoom43", "squash43"];
      const squareKeys = ["crop11", "zoom11", "squash11"];
      if (input.checked && fourThreeKeys.includes(key)) {
        for (const squareKey of squareKeys) this.settings[squareKey] = false;
      }
      if (input.checked && squareKeys.includes(key)) {
        for (const fourThreeKey of fourThreeKeys) this.settings[fourThreeKey] = false;
      }
      if (key === "crop43" && input.checked) this.settings.squash43 = false;
      if (key === "squash43" && input.checked) this.settings.crop43 = false;
      if (key === "crop11" && input.checked) this.settings.squash11 = false;
      if (key === "squash11" && input.checked) this.settings.crop11 = false;

      if (key === "colorPalette" && HARDWARE_PRESETS[this.settings.colorPalette]) {
        Object.assign(this.settings, HARDWARE_PRESETS[this.settings.colorPalette]);
      }
      this.runtimeColumns = this.settings.columns;
      this.runtimeRows = this.settings.rows;
      this.runtimeFps = this.settings.fps;
      this.runtimeVectorSampleScale = this.settings.vectorSampleScale;
      this.canvas.style.opacity = String(this.settings.opacity);
      if (["columns", "rows", "autoRows", "crop43", "zoom43", "squash43", "crop11", "zoom11", "squash11", "vectorSampleScale", "preset"].includes(key)) this.rebuildGrid();
      if (key === "glyphSet") this.rebuildGrid();
      if (["wowFlutter", "bitCrushMode", "pitchShift", "audioFilter", "audioMix"].includes(key)) this.applyAudioEffects();
      if (key === "scanlines" && this.scanlineOverlay) this.scanlineOverlay.hidden = !this.settings.scanlines;
      if (key === "visualEffects" && this.effectsCanvas) {
        this.effectsCanvas.hidden = !this.settings.visualEffects;
        if (!this.settings.visualEffects) {
          this.effectsContext?.clearRect(0, 0, this.effectsCanvas.width, this.effectsCanvas.height);
          this.effectParticles.length = 0;
          this.effectHasHistory = false;
          this.resetCowCameo(true);
        }
      }
      if (key === "cowCameo" && !this.settings.cowCameo) {
        this.resetCowCameo(true);
      }
      if ((key === "colorPalette" && this.settings.colorPalette === "mooburst") || (key === "cowCameo" && this.settings.cowCameo)) {
        this.ensureCowImage();
      }
      if (key === "cowCameo" && this.settings.cowCameo) this.prepareCowAudio().catch(() => {});
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
      return `${title}_ansi_tube.${extension}`;
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
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = this.canvas.width;
      exportCanvas.height = this.canvas.height;
      const context = exportCanvas.getContext("2d", { alpha: false });
      context.imageSmoothingEnabled = false;
      context.drawImage(this.canvas, 0, 0);
      if (this.cowCanvas && !this.cowCanvas.hidden) {
        context.save();
        context.globalCompositeOperation = "screen";
        context.drawImage(this.cowCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
        context.restore();
      }
      if (this.settings.visualEffects && this.effectsCanvas && !this.effectsCanvas.hidden) {
        context.drawImage(this.effectsCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
      }
      if (this.settings.scanlines) {
        context.fillStyle = "rgba(0,0,0,0.18)";
        const spacing = Math.max(4, Math.round(exportCanvas.height / 180));
        for (let y = spacing - 1; y < exportCanvas.height; y += spacing) context.fillRect(0, y, exportCanvas.width, 1);
      }
      exportCanvas.toBlob((blob) => {
        if (blob) this.downloadBlob(blob, this.safeFilename("png"));
      }, "image/png");
    }

    exportAns() {
      if (!this.buffers) return;
      const ansi = Core.buildAns(this.buffers, this.settings.paletteDepth, this.settings.glyphSet);
      this.downloadBlob(new Blob([ansi], { type: "text/plain;charset=utf-8" }), this.safeFilename("ans"));
    }

    async createAudioGraph() {
      if (!this.video) return null;
      const existing = this.audioByVideo.get(this.video);
      if (existing) return existing;
      if (this.audioGraphPromise && this.audioGraphPromiseVideo === this.video) return this.audioGraphPromise;

      const video = this.video;
      this.audioGraphPromiseVideo = video;
      this.audioGraphPromise = this.buildAudioGraph(video);
      try {
        return await this.audioGraphPromise;
      } finally {
        if (this.audioGraphPromiseVideo === video) {
          this.audioGraphPromise = null;
          this.audioGraphPromiseVideo = null;
        }
      }
    }

    async buildAudioGraph(video) {

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio is unavailable in this browser.");
      const context = new AudioContextClass();
      await context.audioWorklet.addModule(chrome.runtime.getURL("audio-worklet.js"));
      const processor = new AudioWorkletNode(context, "ansi-tube-audio", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2]
      });
      const source = context.createMediaElementSource(video);
      const dry = context.createGain();
      const wet = context.createGain();
      const highpass = context.createBiquadFilter();
      const lowpass = context.createBiquadFilter();
      const wowDelay = context.createDelay(0.05);
      const flutterDelay = context.createDelay(0.02);
      const wowOscillator = context.createOscillator();
      const wowDepth = context.createGain();
      const flutterOscillator = context.createOscillator();
      const flutterDepth = context.createGain();

      dry.gain.value = 1;
      wet.gain.value = 0;
      highpass.type = "highpass";
      highpass.frequency.value = 20;
      highpass.Q.value = 0.7;
      lowpass.type = "lowpass";
      lowpass.frequency.value = 20000;
      lowpass.Q.value = 0.7;
      wowDelay.delayTime.value = 0;
      flutterDelay.delayTime.value = 0;
      wowOscillator.frequency.value = 0.62;
      wowDepth.gain.value = 0;
      flutterOscillator.frequency.value = 6.4;
      flutterDepth.gain.value = 0;

      source.connect(dry).connect(context.destination);
      source.connect(processor).connect(highpass).connect(lowpass).connect(wowDelay).connect(flutterDelay).connect(wet).connect(context.destination);
      wowOscillator.connect(wowDepth).connect(wowDelay.delayTime);
      flutterOscillator.connect(flutterDepth).connect(flutterDelay.delayTime);
      wowOscillator.start();
      flutterOscillator.start();

      const graph = { video, context, dry, wet, processor, highpass, lowpass, wowDelay, flutterDelay, wowDepth, flutterDepth };
      this.audioByVideo.set(video, graph);
      return graph;
    }

    bypassAudioGraph() {
      const graph = this.video ? this.audioByVideo.get(this.video) : null;
      if (!graph) return;
      const now = graph.context.currentTime;
      graph.dry.gain.setTargetAtTime(1, now, 0.015);
      graph.wet.gain.setTargetAtTime(0, now, 0.015);
    }

    async applyAudioEffects() {
      const enabled = this.settings.wowFlutter || this.settings.bitCrushMode !== "off" || this.settings.pitchShift !== 0 || this.settings.audioFilter !== "off";
      try {
        if (!enabled) {
          this.bypassAudioGraph();
          return;
        }
        const graph = await this.createAudioGraph();
        if (!this.active || this.video !== graph.video) {
          graph.dry.gain.value = 1;
          graph.wet.gain.value = 0;
          return;
        }
        await graph.context.resume();
        const now = graph.context.currentTime;
        graph.processor.port.postMessage({
          type: "settings",
          bitCrushMode: this.settings.bitCrushMode,
          pitchShift: this.settings.pitchShift
        });
        const filter = {
          off: [20, 20000],
          am: [180, 5200],
          telephone: [350, 3300],
          underwater: [20, 900]
        }[this.settings.audioFilter] || [20, 20000];
        const crushCeiling = this.settings.bitCrushMode === "bit1" ? 6000 : this.settings.bitCrushMode === "bit2" ? 3600 : 20000;
        graph.highpass.frequency.setTargetAtTime(filter[0], now, 0.02);
        graph.lowpass.frequency.setTargetAtTime(Math.min(filter[1], crushCeiling), now, 0.02);
        graph.wowDelay.delayTime.setTargetAtTime(this.settings.wowFlutter ? 0.006 : 0, now, 0.012);
        graph.flutterDelay.delayTime.setTargetAtTime(this.settings.wowFlutter ? 0.0012 : 0, now, 0.012);
        graph.wowDepth.gain.setTargetAtTime(this.settings.wowFlutter ? 0.0032 : 0, now, 0.012);
        graph.flutterDepth.gain.setTargetAtTime(this.settings.wowFlutter ? 0.00048 : 0, now, 0.012);
        graph.dry.gain.cancelScheduledValues(now);
        graph.wet.gain.cancelScheduledValues(now);
        const mix = Math.max(0, Math.min(1, Number(this.settings.audioMix)));
        graph.dry.gain.setTargetAtTime(1 - mix, now, 0.015);
        graph.wet.gain.setTargetAtTime(mix, now, 0.015);
        this.audioGraph = graph;
        const effects = [
          this.settings.wowFlutter && "wow + flutter",
          this.settings.bitCrushMode === "bit1" && "bit crush 1",
          this.settings.bitCrushMode === "bit2" && "bit crush 2",
          this.settings.pitchShift !== 0 && `pitch ${this.settings.pitchShift > 0 ? "+" : ""}${this.settings.pitchShift}`,
          this.settings.audioFilter !== "off" && this.settings.audioFilter
        ].filter(Boolean).join(" + ");
        this.setStatus(`Live · ${effects} on`, "ok");
      } catch (error) {
        this.bypassAudioGraph();
        this.setStatus(`Audio effect unavailable: ${error?.message || "unknown error"}`, "error");
      }
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
        if (!this.desiredActive) return;
        this.stop({ preserveIntent: true });
        window.clearTimeout(this.navigationRestartTimer);
        this.navigationRestartTimer = window.setTimeout(() => {
          this.navigationRestartTimer = 0;
          this.reconcileState().catch((error) => console.error("ANSI Tube restart failed.", error));
        }, 700);
      }, 500);
    }
  }

  const ansiTube = new AnsiTube();
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "ANSI_TUBE_TOGGLE") {
      ansiTube.toggle().catch((error) => console.error("ANSI Tube toggle failed.", error));
    }
  });
})();
