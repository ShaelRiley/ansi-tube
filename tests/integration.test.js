const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../core.js");

const root = path.join(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const css = fs.readFileSync(path.join(root, "content.css"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.version, "0.9.6");
assert.equal(manifest.manifest_version, 3, "Chrome Web Store submissions should use Manifest V3");
assert.deepEqual(manifest.permissions, ["storage"], "Only local settings storage should require an API permission");
assert.deepEqual(manifest.host_permissions, ["https://www.youtube.com/*"], "Host access should be limited to YouTube");
assert.equal(manifest.homepage_url, "https://github.com/ShaelRiley/ansi-tube");

for (const resource of [
  ...manifest.content_scripts.flatMap((entry) => [...entry.js, ...entry.css]),
  ...manifest.web_accessible_resources.flatMap((entry) => entry.resources)
]) {
  assert(fs.existsSync(path.join(root, resource)), `Manifest resource ${resource} should exist`);
}

function pngDimensions(relativePath) {
  const data = fs.readFileSync(path.join(root, relativePath));
  assert.equal(data.toString("ascii", 1, 4), "PNG", `${relativePath} should be a PNG`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

for (const [size, resource] of Object.entries(manifest.icons)) {
  assert(fs.existsSync(path.join(root, resource)), `Manifest icon ${resource} should exist`);
  assert.deepEqual(pngDimensions(resource), [Number(size), Number(size)], `${resource} should match its declared size`);
}
assert.deepEqual(pngDimensions("assets/icon-128.png"), [128, 128], "Store package should include the required 128px icon");

function optionValues(selectId) {
  const start = content.indexOf(`<select id="${selectId}"`);
  const end = content.indexOf("</select>", start);
  assert(start >= 0 && end > start, `${selectId} should exist`);
  return [...content.slice(start, end).matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
}

for (const glyphSet of optionValues("ansi-tube-glyphs")) {
  assert(Core.GLYPH_SETS[glyphSet], `Glyph menu entry ${glyphSet} should be implemented`);
}
for (const palette of optionValues("ansi-tube-palette")) {
  if (palette === "nativeglyph") continue;
  assert.equal(Core.getPaletteBundle(palette, 8).palette.length, 8, `Palette menu entry ${palette} should be implemented`);
}

for (const retired of ["teal", "phosphor", "nightvision", "apple2"]) {
  assert(!optionValues("ansi-tube-palette").includes(retired), `${retired} should not remain in the palette menu`);
}

const glyphOptions = optionValues("ansi-tube-glyphs");
assert(glyphOptions.includes("wingdings"), "Wingdings should appear in the glyph menu");
assert(glyphOptions.includes("vectorLines"), "Vector Lines should appear in the glyph menu");
assert(glyphOptions.includes("video64"), "Video 64 should appear in the glyph menu");
assert(glyphOptions.includes("mosaic"), "Mosaic Blocks should appear in the glyph menu");
assert(!glyphOptions.includes("geometric"), "Redundant Geometric Symbols should be retired from the menu");
for (const palette of ["sunburst", "moonburst", "mooburst", "ruby", "enchantedforest", "nightburst", "snowburst", "cyberburst", "grapeburst", "candyburst", "chromaburst", "soulburst"]) {
  assert(optionValues("ansi-tube-palette").includes(palette), `${palette} should appear in the Burst Family`);
}
assert(content.includes('value="moonburst">Moonburst</option>'), "The lunar palette name should be spelled Moonburst");
assert(content.includes('value="mooburst">MooBurst🐄</option>'), "The cow-inspired MooBurst palette should be clearly labeled");
for (const depth of ["6", "12", "24", "48", "96"]) {
  assert(optionValues("ansi-tube-depth").includes(depth), `${depth}-color depth should appear in the menu`);
}
assert(!glyphOptions.includes("restrictedEmojiTinted"), "Restricted Tinted Emoji should be removed");
assert(!glyphOptions.includes("fullEmojiTinted"), "Full Tinted Emoji should be removed");
assert(content.includes('this.transitionPromise = Promise.resolve()'), "Toggle transitions should be serialized");
assert(content.includes("await this.waitForVideo()"), "Activation should wait briefly for YouTube video readiness");
assert(content.includes('data-setting="crop43"'), "4:3 crop should be independently toggleable");
assert(content.includes('data-setting="zoom43"'), "4:3 zoom should be independently toggleable");
assert(content.includes('data-setting="squash43"'), "4:3 squash should be independently toggleable");
assert(content.includes('data-setting="crop11"'), "1:1 crop should be independently toggleable");
assert(content.includes('data-setting="zoom11"'), "1:1 zoom should be independently toggleable");
assert(content.includes('data-setting="squash11"'), "1:1 squash should be independently toggleable");
assert(content.includes('getFrameSettings()'), "Frame geometry should be resolved consistently");
assert(content.includes('frame.squash ? null : frame.aspect'), "Squash should preserve the full source before fitting the target frame");
assert(content.includes("Core.CELL_WIDTH - 1"), "CJK text should be constrained to each cell width");
assert(content.includes("setControlDisabled(palette, nativeEmoji)"), "Palette state should be explicitly restored after native emoji");
assert(content.includes("Core.traceVectorField"), "Vector mode should use contour-oriented core tracing");
assert(content.includes('data-setting="vectorSampleScale"'), "Vector sampling fidelity should be adjustable");
assert(content.includes('data-setting="vectorEdgeDetail"'), "Vector edge detail should be adjustable");
assert(content.includes('data-setting="vectorLineReach"'), "Vector line reach should be adjustable");
assert(content.includes('data-setting="vectorLineWidth"'), "Vector line width should be adjustable");
assert(content.includes('data-setting="vectorPointSize"'), "Vector point size should be adjustable");
assert(content.includes('data-setting="vectorPoints"'), "Vector point nodes should be toggleable");
assert(content.includes('data-setting="vectorInvert"'), "Vector light/dark balance should be invertible");
assert(content.includes("Core.invertLuminanceColor"), "True-color vector inversion should preserve color relationships");
assert(content.includes('data-setting="videoGlyphStability"'), "Video 64 temporal stability should be adjustable");
assert(content.includes('data-setting="visualEffects"'), "Reactive effects should be independently toggleable");
assert(content.includes('data-setting="effectStyle"'), "Reactive effect style should be selectable");
assert(content.includes('data-setting="effectIntensity"'), "Reactive effect intensity should be adjustable");
assert(content.includes("Core.getEffectTuning"), "Reactive effects should use independently calibrated sensitivity profiles");
assert(content.includes("tuning.hotspotLuminance"), "Bright-source detection should use calibrated sensitivity");
assert(content.includes("tuning.eventDelta"), "Event effects should use a dedicated trigger threshold");
assert(content.includes("tuning.eventLuminance"), "Event effects should accept moderate lighting changes independently of aura detection");
assert(content.indexOf("const eventHotspot") < content.indexOf("const auraHotspots"), "Event selection should occur before aura count limiting");
assert(content.includes("tuning.outlineEdge"), "Outlines should use a dedicated edge threshold");
assert(content.includes("tuning.maxParticles") && content.includes("tuning.maxOutlines"), "Responsive effects should retain bounded activity caps");
assert(content.includes("saved.settingsVersion < 9"), "v0.8 effect intensity and Moonburst settings should migrate");
assert(content.includes("if (this.settings.visualEffects) this.renderReactiveEffects(source.data, now)"), "Effects should react to video only when enabled");
assert(content.includes('className = "ansi-tube-effects"'), "Effects should render on a dedicated low-resolution overlay");
assert(css.includes(".ansi-tube-effects") && css.includes("object-fit: contain"), "Effects should share the ANSI canvas fitting geometry");
assert(content.includes('data-setting="cowCameo"'), "MooBurst should unlock an optional cow cameo toggle");
assert(content.includes('data-setting="cowVolume"'), "Cow audio should have its own volume control");
assert(content.includes('data-action="test-moo"'), "Cow audio should have a direct user-gesture sound test");
assert(content.includes("const cowControlsUnlocked = mooBurstActive || this.settings.cowCameo"), "An enabled cow effect should stay unlocked across other palettes");
assert(content.includes('cowControls.toggleAttribute("hidden", !cowControlsUnlocked)'), "Cow controls should hide only when locked and inactive");
assert(css.includes('[data-cow-controls][hidden]') && css.includes("display: none !important"), "Cow controls should not be displayable while hidden");
assert(content.includes('const enabled = this.settings.cowCameo && this.settings.visualEffects'), "Unlocked cow cameos should work with every palette");
assert(!content.includes('this.settings.colorPalette === "mooburst" && this.settings.cowCameo'), "Cow rendering should not remain coupled to the MooBurst palette");
assert(content.includes("findQuietCowPlacement"), "Cow cameos should seek a low-detail placement");
assert(content.includes("Core.getCowTiming"), "Cow cameos should use bounded first-appearance and recurrence timing");
assert(content.includes("Core.isCowMoment"), "Cow scene selection should admit calm and rain-textured scenes");
assert(content.includes("dramaticallyDue ||"), "A random miss should never postpone cow cameos forever");
assert(content.includes("Math.min(now + 1800") && content.includes("this.cowForceAt)"), "Scene checks should land exactly on the guaranteed cow deadline");
assert(content.includes('className = "ansi-tube-cow"'), "Cow art should use a dedicated aligned local canvas");
assert(css.includes(".ansi-tube-cow") && css.includes("z-index: 22"), "Cow art should sit subtly behind the other effects");
assert.deepEqual(pngDimensions("assets/cow-blond.png"), [512, 512], "Cow cameo should use the optimized bundled realistic PNG");
assert(fs.statSync(path.join(root, "assets/cow-blond.png")).size <= 100000, "Cow cameo PNG should remain below 100 KB");
assert(manifest.web_accessible_resources.some((entry) => entry.resources.includes("assets/cow-blond.png")), "The bundled cow PNG should be narrowly exposed to YouTube");
assert(content.includes('chrome.runtime.getURL("assets/cow-blond.png")'), "Cow PNG should load locally from the extension package");
assert(content.includes('globalCompositeOperation = "screen"') && css.includes("mix-blend-mode: screen"), "The black-backed cow asset should blend without a rectangular veil in live view and export");
assert(content.includes("elapsed / 2200") && content.includes("elapsed) / 2600"), "The realistic cow should fade in and out gradually");
assert(content.includes("playCowMoo") && content.includes("prepareCowAudio"), "Each cow appearance should request a locally synthesized moo");
assert(content.includes("this.video.muted || this.video.volume <= 0"), "The moo should honor YouTube mute and volume");
assert(content.includes('voice.type = "sawtooth"') && content.includes('formantLow.type = "peaking"'), "The moo should use a low vocal-formant synthesis contour");
assert(content.includes('overtone.type = "sine"') && content.includes("lowpass.frequency.value = 1100"), "The moo should include audible upper harmonics for small speakers and noisy videos");
assert(content.includes("Math.min(0.13"), "The moo should have enough headroom to remain audible over video audio");
assert(content.includes("context.drawImage(this.cowCanvas"), "Cow cameos should be included in PNG exports");
assert(content.includes('prefers-reduced-motion: reduce'), "Moving effects should respect reduced-motion preferences");
assert(content.includes("this.settings.panelCollapsed = !this.settings.panelCollapsed"), "Collapsed state should update persistent settings");
assert(content.includes("chrome.storage.local.set({ panelCollapsed"), "Collapsed state should persist across videos");
assert(content.includes("this.settings.panelCollapsed = this.sessionPanelCollapsed"), "In-session collapse state should survive navigation without a storage race");
assert(content.includes('panel.dataset.shorts = String(this.isShorts())'), "The panel should identify Shorts layout");
assert(css.includes('[data-shorts="true"][data-collapsed="true"]'), "Collapsed Shorts controls should have a safe position");
assert(content.includes('panel.dataset.idle = "false"'), "Collapsed controls should track local idle visibility");
assert(content.includes("}, 2200)"), "Collapsed controls should fade after a short inactivity delay");
assert(css.includes('.ansi-tube-host.ytp-autohide .ansi-tube-panel[data-collapsed="true"]'), "Collapsed controls should follow YouTube autohide");
assert(css.includes('[data-collapsed="true"][data-idle="true"]'), "Collapsed controls should autohide outside fullscreen and Shorts");
assert(content.includes('class="ansi-tube-section"'), "Long controls should be grouped into disclosure sections");
assert(content.includes('aria-live="polite"'), "Status changes should be announced accessibly");
assert(css.includes(":focus-visible"), "Keyboard focus should be visibly indicated");
const glyphMenuStart = content.indexOf('<select id="ansi-tube-glyphs"');
const glyphMenu = content.slice(glyphMenuStart, content.indexOf("</select>", glyphMenuStart));
assert(glyphMenu.includes("Optimized ANSI") && glyphMenu.includes("Optimized ASCII") && glyphMenu.includes("Optimized Emoji"));
assert(!/>[^<]*(?:Restrict|Restricted)[^<]*</.test(glyphMenu), "Visible glyph labels should use Optimized terminology");
assert(content.includes('this.settings.glyphSet === "video64" ? 4 : 2'), "Video 64 should use four horizontal analysis samples per cell");
assert(content.includes('this.settings.glyphSet === "video64" ? 8 : 2'), "Video 64 should use eight vertical analysis samples per cell");
assert(!content.includes("setControlDisabled(depth, nativeEmoji || vectorLines)"), "Vector mode should leave palette depth available");

for (const storeFile of ["store/PRIVACY_POLICY.md", "store/STORE_LISTING.md", "store/REVIEW_NOTES.md", "store/RELEASE_CHECKLIST.md"]) {
  assert(fs.existsSync(path.join(root, storeFile)), `${storeFile} should be prepared for Store submission`);
}
assert.deepEqual(pngDimensions("store-assets/promo-small-440x280.png"), [440, 280], "Store promo tile should use the required dimensions");
for (const runtimeFile of ["content.js", "core.js", "service-worker.js", "audio-worklet.js"]) {
  const source = fs.readFileSync(path.join(root, runtimeFile), "utf8");
  assert(!/\beval\s*\(|new\s+Function\s*\(|\bfetch\s*\(|XMLHttpRequest/.test(source), `${runtimeFile} should not execute or retrieve remote code`);
}

console.log("ANSI Tube integration tests passed.");
