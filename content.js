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
    scanlines: false
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
      this.settings = { ...DEFAULTS };
      this.runtimeColumns = DEFAULTS.columns;
      this.runtimeRows = DEFAULTS.rows;
      this.runtimeFps = DEFAULTS.fps;
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
      if (!("paletteDepth" in saved) && saved.palette) {
        this.settings.paletteDepth = saved.palette === "ansi16" ? 16 : saved.palette === "truecolor" ? "truecolor" : 32;
      }
      if (!("bitCrushMode" in saved) && saved.bitCrush) this.settings.bitCrushMode = "bit1";
      delete this.settings.bitCrush;
      if (this.settings.colorPalette === "apple2") this.settings.colorPalette = "apple2e";
      const retiredPalettes = { teal: "cyan", phosphor: "green", nightvision: "green" };
      this.settings.colorPalette = retiredPalettes[this.settings.colorPalette] || this.settings.colorPalette;
      const retiredGlyphSets = { restrictedEmojiTinted: "wingdings", fullEmojiTinted: "wingdings" };
      this.settings.glyphSet = retiredGlyphSets[this.settings.glyphSet] || this.settings.glyphSet;
      this.runtimeColumns = this.settings.columns;
      this.runtimeRows = this.settings.rows;
      this.runtimeFps = this.settings.fps;
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
      this.panel?.remove();
      this.host?.classList.remove("ansi-tube-host");
      this.canvas = null;
      this.scanlineOverlay = null;
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
      this.rebuildGrid();
    }

    rebuildGrid() {
      if (!this.video || !this.canvas) return;
      const aspect = this.video.videoWidth / this.video.videoHeight;
      const grid = this.settings.autoRows
        ? Core.computeGrid(this.runtimeColumns, aspect)
        : { columns: this.runtimeColumns, rows: Math.max(10, Math.min(120, Math.round(this.runtimeRows))) };
      this.runtimeRows = grid.rows;
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
        if (this.settings.glyphSet === "restrictAnsi") this.context.putImageData(this.outputImage, 0, 0);
        else this.renderTextFrame();
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
          context.fillText(glyph, x, y);
        }
      }
      context.restore();
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
            <label for="ansi-tube-rows">Rows</label>
            <input id="ansi-tube-rows" data-setting="rows" type="range" min="10" max="120" step="2">
            <span class="ansi-tube-value" data-value="rows"></span>
          </div>
          <label class="ansi-tube-row ansi-tube-check">
            <input data-setting="autoRows" type="checkbox">
            Keep source aspect ratio
          </label>
          <div class="ansi-tube-row">
            <label for="ansi-tube-fps">ANSI FPS</label>
            <input id="ansi-tube-fps" data-setting="fps" type="range" min="8" max="30" step="1">
            <span class="ansi-tube-value" data-value="fps"></span>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-palette">Palette</label>
            <select id="ansi-tube-palette" data-setting="colorPalette">
              <optgroup label="Core">
                <option value="standard">Standard</option>
                <option value="nativeglyph">Native Glyph</option>
                <option value="cga">CGA</option>
                <option value="ega">EGA</option>
                <option value="vga">VGA</option>
                <option value="svga">SVGA</option>
              </optgroup>
              <optgroup label="Monochrome">
                <option value="blackwhite">Black &amp; White</option>
                <option value="cyan">Cyan</option>
                <option value="yellow">Yellow</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
                <option value="purple">Purple</option>
                <option value="blue">Blue</option>
                <option value="pink">Pink</option>
                <option value="orange">Orange</option>
                <option value="amber">Amber</option>
                <option value="ice">Ice</option>
                <option value="toxic">Toxic</option>
                <option value="sepia">Sepia</option>
              </optgroup>
              <optgroup label="Old Hardware">
                <option value="nes">NES</option>
                <option value="sms">SMS</option>
                <option value="genesis">Genesis</option>
                <option value="c64">C64</option>
                <option value="apple2e">Apple IIe</option>
                <option value="apple2green">Apple II Mono Green</option>
                <option value="gbdmg">GB DMG</option>
                <option value="virtualb">Virtual B</option>
                <option value="snes">SNES</option>
                <option value="vexitrexi">Vexi Trexi</option>
                <option value="zedexspectral">S Zed Ex Spectral</option>
                <option value="atari2600">Atari 2600</option>
                <option value="atari5200">Atari 5200</option>
                <option value="trash80">Trash 80</option>
              </optgroup>
              <optgroup label="Creative">
                <option value="oldtv">Old TV</option>
                <option value="eighties">1980s</option>
                <option value="sunburst">Sunburst</option>
                <option value="space">Space</option>
                <option value="psychedelic">Psychedelic</option>
                <option value="caveman">Caveman</option>
                <option value="oceania">Oceania</option>
                <option value="metallics">Metallics</option>
                <option value="silvergold">Silver and Gold</option>
                <option value="supercomic">Super Comic</option>
                <option value="hyperreal">Hyper Real</option>
              </optgroup>
            </select>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-depth">Palette depth</label>
            <select id="ansi-tube-depth" data-setting="paletteDepth">
              <option value="2">2 colors</option>
              <option value="3">3 colors</option>
              <option value="4">4 colors</option>
              <option value="8">8 colors</option>
              <option value="16">16 colors</option>
              <option value="32">32 colors</option>
              <option value="64">64 colors</option>
              <option value="128">128 colors</option>
              <option value="256">256 colors</option>
              <option value="truecolor">True Color</option>
            </select>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-glyphs">Glyph set</label>
            <select id="ansi-tube-glyphs" data-setting="glyphSet">
              <option value="restrictAnsi">Restrict ANSI</option>
              <option value="fullAnsi">Full ANSI</option>
              <option value="restrictedAscii">Restricted ASCII</option>
              <option value="fullAscii">Full ASCII</option>
              <option value="binary">Binary</option>
              <option value="wingdings">Wingdings</option>
              <option value="chinese">Chinese</option>
              <option value="japanese">Japanese</option>
              <option value="korean">Korean</option>
              <option value="braille">Braille</option>
              <option value="geometric">Geometric Symbols</option>
              <option value="restrictedEmoji">Restricted Emoji · Native</option>
              <option value="fullEmoji">Full Emoji · Native</option>
            </select>
          </div>
          <div class="ansi-tube-hint" data-emoji-hint hidden></div>
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
          <label class="ansi-tube-row ansi-tube-check">
            <input data-setting="wowFlutter" type="checkbox">
            Add wow + flutter to audio
          </label>
          <div class="ansi-tube-row">
            <label for="ansi-tube-bitcrush">Bit crush</label>
            <select id="ansi-tube-bitcrush" data-setting="bitCrushMode">
              <option value="off">Off</option>
              <option value="bit1">Bit Crush 1 · gated</option>
              <option value="bit2">Bit Crush 2 · radio</option>
            </select>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-pitch">Pitch shift</label>
            <input id="ansi-tube-pitch" data-setting="pitchShift" type="range" min="-4" max="4" step="1">
            <span class="ansi-tube-value" data-value="pitchShift"></span>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-filter">Audio filter</label>
            <select id="ansi-tube-filter" data-setting="audioFilter">
              <option value="off">Off</option>
              <option value="am">AM Radio</option>
              <option value="telephone">Telephone</option>
              <option value="underwater">Underwater</option>
            </select>
          </div>
          <div class="ansi-tube-row">
            <label for="ansi-tube-audio-mix">Audio mix</label>
            <input id="ansi-tube-audio-mix" data-setting="audioMix" type="range" min="0" max="1" step="0.05">
            <span class="ansi-tube-value" data-value="audioMix"></span>
          </div>
          <label class="ansi-tube-row ansi-tube-check">
            <input data-setting="scanlines" type="checkbox">
            Add CRT scanlines
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
      const rows = this.panel.querySelector('[data-setting="rows"]');
      if (rows) rows.disabled = this.settings.autoRows;
      const glyphSet = Core.GLYPH_SETS[this.settings.glyphSet] || Core.GLYPH_SETS.restrictAnsi;
      const nativeEmoji = glyphSet.type === "emoji" && glyphSet.nativeColor;
      const palette = this.panel.querySelector('[data-setting="colorPalette"]');
      const depth = this.panel.querySelector('[data-setting="paletteDepth"]');
      if (palette) palette.disabled = nativeEmoji;
      if (depth) depth.disabled = nativeEmoji;
      const hint = this.panel.querySelector("[data-emoji-hint]");
      if (hint) {
        const cjk = ["chinese", "japanese", "korean"].includes(this.settings.glyphSet);
        hint.hidden = glyphSet.type !== "emoji" && !cjk;
        hint.textContent = cjk
          ? "CJK shapes use your installed Noto/system fonts. If you see empty boxes, install the matching Noto Sans CJK font."
          : "Native emoji keep the font’s built-in colors; palette and depth are unavailable.";
      }
      this.updateRuntimeLabels();
    }

    updateRuntimeLabels() {
      if (!this.panel) return;
      const formats = {
        columns: () => String(this.runtimeColumns),
        rows: () => this.settings.autoRows ? `Auto ${this.runtimeRows}` : String(this.runtimeRows),
        fps: () => String(this.runtimeFps),
        saturationBoost: () => `${Math.round(this.settings.saturationBoost * 100)}%`,
        brightnessBoost: () => `${Math.round(this.settings.brightnessBoost * 100)}%`,
        blackThreshold: () => this.settings.blackThreshold.toFixed(3),
        opacity: () => `${Math.round(this.settings.opacity * 100)}%`,
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
        this.settings[key] = key === "paletteDepth" && input.value !== "truecolor" ? Number(input.value) : input.value;
        this.settings.preset = "custom";
      }

      if (key === "colorPalette" && HARDWARE_PRESETS[this.settings.colorPalette]) {
        Object.assign(this.settings, HARDWARE_PRESETS[this.settings.colorPalette]);
      }

      this.runtimeColumns = this.settings.columns;
      this.runtimeRows = this.settings.rows;
      this.runtimeFps = this.settings.fps;
      this.canvas.style.opacity = String(this.settings.opacity);
      if (["columns", "rows", "autoRows", "preset"].includes(key)) this.rebuildGrid();
      if (key === "glyphSet") this.rebuildGrid();
      if (["wowFlutter", "bitCrushMode", "pitchShift", "audioFilter", "audioMix"].includes(key)) this.applyAudioEffects();
      if (key === "scanlines" && this.scanlineOverlay) this.scanlineOverlay.hidden = !this.settings.scanlines;
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
