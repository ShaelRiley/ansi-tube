# ANSI Tube

ANSI Tube is a self-contained Chrome extension that renders ordinary YouTube videos as live ANSI, ASCII, an original 64-shape video alphabet, mosaic blocks, binary, Wingdings, CJK, Braille, emoji mosaic, or multitone vector-line art. Optional video-reactive effects add palette-matched blooms, particles, phosphor trails, rays, auras, and contour accents. Video pixels stay in the browser.

ANSI Tube is an independent project and is not affiliated with or endorsed by YouTube or Google.

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
- **4:3 and 1:1 framing:** Either ratio can center-crop the source, add a 1.25× center zoom, or squash the complete source into the target frame. Zoom combines with crop or squash; crop and squash are mutually exclusive, as are the two target ratios.
- **ANSI FPS:** conversion cadence independent from the video's frame rate.
- **Palette style:** Standard, Native Glyph, CGA, EGA, VGA, SVGA, focused monochrome treatments, old-hardware treatments, and creative palettes.
- **Burst family:** Sunburst plus Moonburst, MooBurst🐄, Ruby, Enchanted Forest, Nightburst, Snowburst, Cyberburst, Grapeburst, Candyburst, Chromaburst, and Soulburst. Each is an independent luminance-mapped color journey rather than a simple tint; MooBurst travels through hide, pasture, cowbell, pink nose, cream, and milk-white tones.
- **Old hardware:** NES, SMS, Genesis, C64, Apple IIe, Apple II Mono Green, GB DMG, Virtual B, SNES, Vexi Trexi, S Zed Ex Spectral, Atari 2600, Atari 5200, and Trash 80. Each automatically applies its own color-boost, brightness, and black-floor treatment.
- **Palette depth:** 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 256, or True Color.
- **Glyph set:** Optimized ANSI, Full ANSI, Optimized ASCII, Full ASCII, Video 64 Homebrew, Mosaic Blocks, Binary, Wingdings, Chinese, Japanese, Korean, Braille, Optimized and Full native Emoji, and Vector Lines.
- **Mosaic Blocks:** a stable partial-block vocabulary for silhouettes and directional boundaries. It replaces the broader, redundant Geometric Symbols menu entry; saved Geometric selections migrate automatically.
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
- **True audio bypass:** when every retro-audio option is off, the wet chain stays muted. Async graph setup is rechecked before routing, preventing a recently disabled effect from reactivating processing after its worklet finishes loading.
- **CRT scanlines:** optional display texture added as a lightweight compositing layer.
- **Reactive effects:** off by default. Adaptive Mix combines event-triggered particles, phosphor afterflow, light-source auras, restrained god rays, and black/radiant edge accents. Dedicated Phosphor, Auras, and Outline modes are also available. Each family has an independent sensitivity and strength curve: auras favor sustained bright sources, phosphor favors ordinary motion and lighting changes, outlines follow spatial edges, and particles/rays follow stronger events. Activity remains capped at every intensity. Analysis uses only a 32-column proxy and a small transparent canvas.
- **MooBurst cow cameos:** selecting MooBurst reveals a secret cow-and-moo toggle under Reactive Effects. Once enabled, the cow remains available across every palette until explicitly turned off; turning it off outside MooBurst hides the control until MooBurst unlocks it again. Local frame heuristics prefer a visually quiet corner and gradually fade in an optimized, transparently composited photorealistic cow with flowing blond hair, keeping it visible on both dark and bright palettes. A bounded scheduler guarantees the first visit within about 22 seconds and recurring visits within 75–100 seconds, while a dedicated volume control and Test Moo button make the locally synthesized stereo sound easy to verify. The cow's separate audio context suspends after each moo and whenever the effect or extension is disabled. The moo honors YouTube's mute and volume settings. No image recognition, network service, or video data upload is involved.
- **Accessibility:** controls are grouped into native keyboard-accessible disclosure sections with visible focus rings and polite status announcements. Reduced-motion systems suppress traveling particles and rays while retaining static auras and outlines.
- **Persistent compact mode:** collapsing the controls persists across YouTube navigation. The compact bar follows YouTube's control visibility and fades after 2.2 seconds in both ordinary and Shorts playback, even when the pointer was left where the normal-video bar collapsed; pointer activity reveals it. Keyboard focus deliberately keeps it visible. On Shorts, it moves to a lower safe area away from the volume slider.
- **Save PNG / Save .ANS:** export the current converted frame. PNG includes active reactive effects and scanlines. Vector Lines and Video 64 use PNG because ordinary ANSI terminals cannot reproduce their custom geometry faithfully.

## Design and privacy

- Manifest V3.
- Only runs on `youtube.com`.
- No analytics, servers, accounts, remote fonts, or external code.
- No video, audio, browsing history, or personal data is transmitted. Decoded frames and optional audio effects are processed transiently on-device.
- Samples a tiny proxy frame: normally `columns × 2` by `rows × 2` pixels, `columns × 4` by `rows × 8` for Video 64, and selectable 2×–6× sampling for Vector Lines.
- Uses one pixelated render canvas plus an optional low-resolution transparent effects canvas rather than thousands of DOM elements.
- Stops conversion while the tab is hidden and avoids reprocessing paused frames.
- Reuses fixed typed-array buffers for cells and rendered pixels.
- Uses cached 15-bit color lookup tables so expanded palettes do not require a full nearest-color search for every cell and frame.
- Uses a compact collapsed control bar so the menu obscures very little of the video; in fullscreen it fades with YouTube's native auto-hidden controls.

The public privacy policy and Chrome Web Store submission notes are in the `store` directory.

## Current limitation

The extension reads decoded frames from YouTube's HTML video element. Ordinary YouTube playback generally exposes a browser-decodable video surface, but protected media may prohibit canvas pixel access. ANSI Tube reports that condition in its control panel. It does not circumvent DRM or protected-media restrictions. Emoji appearance and coverage depend on the color-emoji font installed on the operating system.

## Source layout

- `manifest.json`: extension declaration and YouTube scope.
- `service-worker.js`: toolbar and keyboard toggles.
- `core.js`: deterministic pixel-to-glyph conversion, the packed 64-glyph video atlas and matcher, palette quantization, Sobel/vector contour tracing, flexible source geometry, and ANSI export.
- `content.js`: YouTube integration, adaptive scheduler, multitone vector rendering, reactive effects, accessible UI, and frame export.
- `audio-worklet.js`: deterministic bit crushing, speech gating, and pitch processing off the main rendering thread.
- `content.css`: player overlay and control-panel styling.
