# ANSI Tube

ANSI Tube is a self-contained Chrome extension that renders ordinary YouTube videos as live CP437-inspired ANSI shade/block art. Video pixels stay in the browser. Audio, seeking, playback speed, captions, and YouTube's controls remain YouTube's responsibility.

## Install in Chrome

1. Download and unzip `ansi-tube-extension.zip`.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** in the upper-right corner.
4. Select **Load unpacked**.
5. Choose the unzipped `ansi-tube` folder.
6. Open a YouTube video and click the ANSI Tube extension button.

The default keyboard shortcut is **Alt+Shift+A**. Chrome lets you change it at `chrome://extensions/shortcuts`.

## Performance presets

| Preset | Grid | ANSI FPS | Palette | Intended use |
| --- | ---: | ---: | --- | --- |
| Potato | 80 columns | 12 | ANSI 16 | Older laptops and weak integrated graphics |
| Balanced | 120 columns | 15 | ANSI 32 | Steam Deck and ordinary laptops |
| Deluxe | 160 columns | 24 | Truecolor | Modern desktop hardware |

Adaptive mode lowers ANSI frame rate first, then grid resolution, when conversion consumes most of its frame-time budget. It never changes YouTube's stream quality. For slow connections or weak video decoders, set YouTube itself to 360p or 480p.

## Controls

- **Columns:** spatial resolution from 60–200 terminal columns.
- **ANSI FPS:** conversion cadence independent from the video's frame rate.
- **Palette:** historical ANSI 16, an expanded saturated 32-color palette, or 24-bit truecolor.
- **Color boost / Brightness / Black floor:** tune the BBS presentation.
- **ANSI mix:** fade between the converted canvas and the original video.
- **Save PNG / Save .ANS:** export the current converted frame.

## Design and privacy

- Manifest V3.
- Only runs on `youtube.com`.
- No analytics, servers, accounts, remote fonts, or external code.
- Samples a tiny proxy frame: `columns × 2` by `rows × 2` pixels.
- Uses one pixelated canvas rather than thousands of DOM text elements.
- Stops conversion while the tab is hidden and avoids reprocessing paused frames.
- Reuses fixed typed-array buffers for cells and rendered pixels.

## Current limitation

The extension reads decoded frames from YouTube's HTML video element. Ordinary YouTube playback generally exposes a browser-decodable video surface, but protected media may prohibit canvas pixel access. ANSI Tube reports that condition in its control panel. It does not circumvent DRM or protected-media restrictions.

## Source layout

- `manifest.json`: extension declaration and YouTube scope.
- `service-worker.js`: toolbar and keyboard toggles.
- `core.js`: deterministic pixel-to-glyph conversion and ANSI export.
- `content.js`: YouTube integration, adaptive scheduler, UI, and frame export.
- `content.css`: player overlay and control-panel styling.
