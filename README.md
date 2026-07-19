# ANSI Tube

ANSI Tube is a self-contained Chrome extension that renders ordinary YouTube videos as live ANSI, ASCII, an original 64-shape video alphabet, binary, Wingdings, CJK, Braille, symbol, emoji mosaic, or multitone vector-line art. Video pixels stay in the browser. Audio, seeking, playback speed, captions, and YouTube's controls remain YouTube's responsibility, with optional local retro-audio treatments.

## Install in Chrome

1. Download and unzip the current ANSI Tube release archive.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** in the upper-right corner.
4. Select **Load unpacked**.
5. Choose the unzipped `ansi-tube` folder.
6. Open a YouTube video and click the ANSI Tube extension button.

The default keyboard shortcut is **Alt+Shift+A**. Chrome lets you change it at `chrome://extensions/shortcuts`.

## Performance presets

| Preset | Grid | ANSI FPS | Palette | Intended use |
| --- | ---: | ---: | --- | --- |
| Potato | 80 columns | 12 | Standard, 8 colors | Older laptops and weak integrated graphics |
| Balanced | 120 columns | 15 | Standard, 32 colors | Steam Deck and ordinary laptops |
| Deluxe | 160 columns | 24 | Standard, True Color | Modern desktop hardware |

Adaptive mode lowers Vector sampling first when applicable, then ANSI frame rate and grid resolution, when conversion consumes most of its frame-time budget. It never changes YouTube's stream quality. For slow connections or weak video decoders, set YouTube itself to 360p or 480p.

## Controls

- **Columns:** spatial resolution from 60–200 terminal columns.
- **Rows:** selectable from 10–120, with source-aspect locking enabled by default.
- **4:3 crop / zoom:** Crop centers the source inside a locked 4:3 frame; Zoom adds a 1.25× center magnification. The toggles remain independent and can be combined.
- **ANSI FPS:** conversion cadence independent from the video's frame rate.
- **Palette style:** Standard, Native Glyph, CGA, EGA, VGA, SVGA, focused monochrome treatments, old-hardware treatments, and creative palettes. Red and Virtual B use intentionally different ramps and contrast.
- **Old hardware:** NES, SMS, Genesis, C64, Apple IIe, Apple II Mono Green, GB DMG, Virtual B, SNES, Vexi Trexi, S Zed Ex Spectral, Atari 2600, Atari 5200, and Trash 80. Each automatically applies its own color-boost, brightness, and black-floor treatment.
- **Palette depth:** 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 256, or True Color.
- **Glyph set:** Restrict ANSI, Full ANSI, Restricted ASCII, Full ASCII, Video 64 Homebrew, Binary, Wingdings, Chinese, Japanese, Korean, Braille, Geometric Symbols, native Emoji sets, and Vector Lines.
- **Video 64 · Homebrew:** an original deterministic 8×16 bitmap alphabet optimized for moving images. Its 64 shapes cover masses, partial cells, contours, diagonals, terminals, junctions, curves, compact facial cues, and a small temporally gated texture family. A 4×8 proxy per output cell drives structure-aware matching while independent foreground/background colors preserve local tone and edge polarity.
- **Temporal stability:** Video 64 keeps a previous glyph when the new match is only marginally better, applies a stronger entry threshold to high-frequency texture shapes, and suppresses small palette oscillations. The control ranges from immediate response to steadier motion.
- **Vector Lines:** a palette-aware point-and-segment renderer built from the same sampled frame and quantization pipeline. Palette Depth ranges from stark two-tone contours through True Color.
- **Vector light/dark inversion:** reverses each applicable palette's tonal hierarchy for dark vectors on a light background. True Color uses a hue-preserving luminance reversal; Native Glyph is excluded because it has no coherent palette hierarchy to reverse.
- **Vector sampling:** Fast 2×, Detailed 3×, High 4×, or Ultra 6× source sampling. Higher settings improve contour fidelity at additional processing cost.
- **Vector shaping:** Edge Detail governs feature sensitivity; Line Reach controls contour continuity; Line Width and Point Size control presentation; pointillist nodes can be hidden for a purer wireframe.
- **Wingdings:** a lightweight, colorizable pictogram set using cross-platform Unicode equivalents for classic Wingdings-style symbols.
- **Emoji color:** Native Emoji preserve the operating system font's own colors, so palette/depth controls are disabled.
- **Color boost / Brightness / Black floor:** tune the BBS presentation.
- **ANSI mix:** fade between the converted canvas and the original video.
- **Wow + flutter:** optional tape-like pitch instability generated locally through the Web Audio API; off by default and persistent across videos when enabled.
- **Bit Crush 1:** deterministic 5-bit/sample-hold processing with a soft speech gate that suppresses low-level noise between spoken passages.
- **Bit Crush 2:** a more compact digital-radio sound using sample hold and μ-law-style companding, without injected noise.
- **Pitch shift:** shifts the processed audio up or down by as much as four semitones without changing YouTube playback speed.
- **Audio filter and mix:** AM Radio, Telephone, and Underwater tone filters plus dry/wet control.
- **CRT scanlines:** optional display texture added as a lightweight compositing layer.
- **Save PNG / Save .ANS:** export the current converted frame. Vector Lines and Video 64 use PNG because ordinary ANSI terminals cannot reproduce their custom geometry faithfully.

## Design and privacy

- Manifest V3.
- Only runs on `youtube.com`.
- No analytics, servers, accounts, remote fonts, or external code.
- Samples a tiny proxy frame: normally `columns × 2` by `rows × 2` pixels, `columns × 4` by `rows × 8` for Video 64, and selectable 2×–6× sampling for Vector Lines.
- Uses one pixelated canvas rather than thousands of DOM text elements.
- Stops conversion while the tab is hidden and avoids reprocessing paused frames.
- Reuses fixed typed-array buffers for cells and rendered pixels.
- Uses cached 15-bit color lookup tables so expanded palettes do not require a full nearest-color search for every cell and frame.
- Uses a compact collapsed control bar so the menu obscures very little of the video; in fullscreen it fades with YouTube's native auto-hidden controls.

## Current limitation

The extension reads decoded frames from YouTube's HTML video element. Ordinary YouTube playback generally exposes a browser-decodable video surface, but protected media may prohibit canvas pixel access. ANSI Tube reports that condition in its control panel. It does not circumvent DRM or protected-media restrictions. Emoji appearance and coverage depend on the color-emoji font installed on the operating system.

## Source layout

- `manifest.json`: extension declaration and YouTube scope.
- `service-worker.js`: toolbar and keyboard toggles.
- `core.js`: deterministic pixel-to-glyph conversion, the packed 64-glyph video atlas and matcher, palette quantization, Sobel/vector contour tracing, 4:3 source geometry, and ANSI export.
- `content.js`: YouTube integration, adaptive scheduler, multitone vector rendering, UI, and frame export.
- `audio-worklet.js`: deterministic bit crushing, speech gating, and pitch processing off the main rendering thread.
- `content.css`: player overlay and control-panel styling.
