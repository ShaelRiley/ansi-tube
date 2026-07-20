const assert = require("node:assert/strict");
const Core = require("../core.js");

const grid = Core.computeGrid(120, 16 / 9);
assert.deepEqual(grid, { columns: 120, rows: 34 });
assert.deepEqual(Core.computeGrid(120, 4 / 3), { columns: 120, rows: 45 });
assert.deepEqual(Core.computeSourceRect(1920, 1080, 4 / 3), { x: 240, y: 0, width: 1440, height: 1080 });
assert.deepEqual(Core.computeSourceRect(1920, 1080, 4 / 3, 1.25), { x: 384, y: 108, width: 1152, height: 864 });
assert.deepEqual(Core.computeSourceRect(1920, 1080, 1), { x: 420, y: 0, width: 1080, height: 1080 });
assert.deepEqual(Core.computeSourceRect(1920, 1080, null), { x: 0, y: 0, width: 1920, height: 1080 });
for (const style of ["adaptive", "phosphor", "auras", "outline"]) {
  const low = Core.getEffectTuning(0, style);
  const middle = Core.getEffectTuning(0.45, style);
  const high = Core.getEffectTuning(1, style);
  assert(low.level < middle.level && middle.level < high.level, `${style} response should rise smoothly`);
  assert(low.hotspotLuminance > middle.hotspotLuminance && middle.hotspotLuminance > high.hotspotLuminance, `${style} bright-source sensitivity should rise`);
  assert(low.eventDelta > middle.eventDelta && middle.eventDelta > high.eventDelta, `${style} event sensitivity should rise`);
  assert(low.outlineEdge > middle.outlineEdge && middle.outlineEdge > high.outlineEdge, `${style} edge sensitivity should rise`);
  assert(low.auraOpacity < middle.auraOpacity && middle.auraOpacity < high.auraOpacity, `${style} aura strength should rise`);
  assert(low.particleOpacity < middle.particleOpacity && middle.particleOpacity < high.particleOpacity, `${style} particle strength should rise`);
  assert(high.maxParticles <= 48 && high.maxOutlines <= 88 && high.rayCount <= 7, `${style} maximum activity should stay bounded`);

  const normalVideoEvent = { value: 184, delta: 36, edge: 104 };
  assert(normalVideoEvent.value >= middle.hotspotLuminance, `${style} should recognize an ordinary bright source at the default setting`);
  assert(normalVideoEvent.delta >= middle.hotspotDelta || normalVideoEvent.edge >= middle.hotspotEdge, `${style} should admit ordinary motion or edges at the default setting`);
  assert(normalVideoEvent.delta > middle.eventDelta, `${style} should react to an ordinary edit or lighting change at the default setting`);
  const moderateLightingChange = { value: 155, delta: 36 };
  assert(moderateLightingChange.value >= middle.eventLuminance && moderateLightingChange.delta > middle.eventDelta, `${style} event effects should not require an exceptionally bright frame`);

  const strongSceneCut = { value: 190, delta: 42, edge: 125 };
  assert(strongSceneCut.value >= low.hotspotLuminance, `${style} should recognize a strong bright source even at minimum`);
  assert(strongSceneCut.delta > low.eventDelta, `${style} should still react to a normal strong scene cut at minimum`);
}
assert(Core.getEffectTuning(0.45, "phosphor").eventDelta < Core.getEffectTuning(0.45, "adaptive").eventDelta, "Phosphor should favor common motion events");
assert(Core.getEffectTuning(0.45, "auras").hotspotLuminance < Core.getEffectTuning(0.45, "adaptive").hotspotLuminance, "Auras should favor persistent light sources");
assert(Core.getEffectTuning(1, "adaptive").maxParticles < Core.getEffectTuning(1, "phosphor").maxParticles, "Adaptive should cap particles below dedicated modes");
assert(Core.getEffectTuning(1, "adaptive").outlineDarkOpacity < Core.getEffectTuning(1, "outline").outlineDarkOpacity, "Adaptive should soften outlines in the mixed presentation");
assert.deepEqual(Core.getCowTiming(1000, true, 0), { eligibleAt: 8000, forceAt: 23000 });
assert.deepEqual(Core.getCowTiming(1000, true, 1), { eligibleAt: 15000, forceAt: 23000 });
assert.deepEqual(Core.getCowTiming(1000, false, 0), { eligibleAt: 46000, forceAt: 76000 });
assert.deepEqual(Core.getCowTiming(1000, false, 1), { eligibleAt: 71000, forceAt: 101000 });
assert(Core.isCowMoment({ mean: 108, motion: 0.4, edge: 145 }), "A calm pasture in textured rain should be a valid cow moment");
assert(!Core.isCowMoment({ mean: 108, motion: 62, edge: 145 }), "Extreme motion should defer a random cow opportunity");
assert(!Core.isCowMoment({ mean: 108, motion: 4, edge: 210 }), "Extremely chaotic detail should defer a random cow opportunity");
assert.deepEqual(Core.resolveFrameSettings({}), { aspect: null, label: "", squash: false, zoom: 1 });
assert.deepEqual(Core.resolveFrameSettings({ crop43: true }), { aspect: 4 / 3, label: "4:3", squash: false, zoom: 1 });
assert.deepEqual(Core.resolveFrameSettings({ squash43: true, zoom43: true }), { aspect: 4 / 3, label: "4:3", squash: true, zoom: 1.25 });
assert.deepEqual(Core.resolveFrameSettings({ crop11: true, zoom11: true }), { aspect: 1, label: "1:1", squash: false, zoom: 1.25 });
assert.deepEqual(Core.resolveFrameSettings({ squash11: true }), { aspect: 1, label: "1:1", squash: true, zoom: 1 });

const black = new Uint8ClampedArray(4 * 4 * 4);
for (let index = 3; index < black.length; index += 4) black[index] = 255;
const buffers = Core.createBuffers(2, 2);
Core.convertInto(black, 4, 4, { palette: "ansi16" }, buffers);
assert.deepEqual([...buffers.glyphs], [0, 0, 0, 0]);
assert(buffers.image.every((value, index) => index % 4 === 3 ? value === 255 : value === 0));

const white = new Uint8ClampedArray(2 * 2 * 4).fill(255);
const oneCell = Core.createBuffers(1, 1);
Core.convertInto(white, 2, 2, { palette: "truecolor" }, oneCell);
assert.equal(oneCell.glyphs[0], 4);
assert.match(Core.buildAns(oneCell, "truecolor"), /\u001b\[38;2;255;255;255m█/);

const directional = new Uint8ClampedArray(2 * 2 * 4);
for (let pixel = 0; pixel < 4; pixel += 1) directional[pixel * 4 + 3] = 255;
for (const pixel of [0, 1]) {
  directional[pixel * 4] = 255;
  directional[pixel * 4 + 1] = 255;
  directional[pixel * 4 + 2] = 255;
}
const directionalCell = Core.createBuffers(1, 1);
Core.convertInto(directional, 2, 2, { palette: "truecolor" }, directionalCell);
assert.equal(Core.GLYPHS[directionalCell.glyphs[0]], "▀");
const mosaicDirectional = Core.createBuffers(1, 1);
Core.convertInto(directional, 2, 2, { glyphSet: "mosaic", palette: "truecolor" }, mosaicDirectional);
assert.equal(Core.getGlyph("mosaic", mosaicDirectional.glyphs[0]), "▀");

const paletteStyles = [
  "standard", "blackwhite", "cga", "ega", "vga", "svga",
  "cyan", "yellow", "green", "red", "purple", "blue", "pink", "orange", "amber",
  "ice", "toxic", "sepia",
  "nes", "sms", "genesis", "c64", "apple2e", "apple2green", "gbdmg", "virtualb", "snes", "vexitrexi", "zedexspectral",
  "atari2600", "atari5200", "trash80", "oldtv", "eighties", "sunburst", "space", "psychedelic",
  "moonburst", "mooburst", "ruby", "enchantedforest", "nightburst", "snowburst", "cyberburst", "grapeburst",
  "candyburst", "chromaburst", "soulburst",
  "caveman", "oceania", "metallics", "silvergold", "supercomic", "hyperreal"
];
for (const style of paletteStyles) {
  for (const depth of Core.PALETTE_DEPTHS) {
    assert.equal(Core.getPaletteBundle(style, depth).palette.length, depth, `${style} should provide ${depth} colors`);
  }
}
const burstStyles = ["sunburst", "moonburst", "mooburst", "ruby", "enchantedforest", "nightburst", "snowburst", "cyberburst", "grapeburst", "candyburst", "chromaburst", "soulburst"];
const burstMidtones = burstStyles.map((style) => Core.quantizeColor(style, "truecolor", 128, 128, 128).join(","));
assert.equal(new Set(burstMidtones).size, burstStyles.length, "Every Burst variant should have a distinct midtone journey");
assert.notDeepEqual(
  Core.quantizeColor("moonburst", "truecolor", 128, 128, 128),
  Core.quantizeColor("mooburst", "truecolor", 128, 128, 128),
  "Moonburst and MooBurst should be independent palettes"
);

assert.equal(Core.PALETTE_DEPTHS[0], 2);
for (const depth of [6, 12, 24, 48, 96]) assert(Core.PALETTE_DEPTHS.includes(depth));
assert(Core.GLYPH_SETS.fullAnsi.glyphs.length >= 250);
assert.equal(Core.GLYPH_SETS.fullAscii.glyphs.length, 95);
assert(Core.GLYPH_SETS.fullEmoji.glyphs.length > Core.GLYPH_SETS.restrictedEmoji.glyphs.length);
assert.deepEqual(Core.GLYPH_SETS.binary.glyphs, ["0", "1"]);
assert(Core.GLYPH_SETS.wingdings.glyphs.includes("✂"));
assert(Core.GLYPH_SETS.wingdings.glyphs.includes("☎"));
assert(Core.GLYPH_SETS.chinese.glyphs.length > 100);
assert(Core.GLYPH_SETS.japanese.glyphs.length > 100);
assert(Core.GLYPH_SETS.korean.glyphs.length > 100);
assert.equal(Core.GLYPH_SETS.braille.glyphs.length, 256);
assert.equal(Core.GLYPH_SETS.mosaic.type, "mosaic");
assert(Core.GLYPH_SETS.mosaic.glyphs.includes("▀"));
assert.equal(Core.GLYPH_SETS.geometric, undefined);
assert.equal(Core.GLYPH_SETS.vectorLines.type, "vector");
assert.equal(Core.GLYPH_SETS.video64.type, "bitmap");
assert.equal(Core.VIDEO_GLYPH_NAMES.length, 64);
assert.equal(Core.VIDEO_GLYPH_MASKS.length, 64);
assert(Core.VIDEO_GLYPH_MASKS.every((mask) => mask.length === 16));
assert.equal(new Set(Core.VIDEO_GLYPH_MASKS.map((mask) => mask.join(","))).size, 64, "Every homebrew glyph should be distinct");
assert.equal(Core.GLYPH_SETS.restrictedEmoji.nativeColor, true);
assert.equal(Core.GLYPH_SETS.restrictedEmojiTinted, undefined);
assert.equal(Core.GLYPH_SETS.fullEmojiTinted, undefined);

const darkBinarySource = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
const darkBinary = Core.createBuffers(1, 1);
Core.convertInto(darkBinarySource, 2, 2, { glyphSet: "binary" }, darkBinary);
assert.equal(Core.getGlyph("binary", darkBinary.glyphs[0]), "0");
const brightBinary = Core.createBuffers(1, 1);
Core.convertInto(white, 2, 2, { glyphSet: "binary" }, brightBinary);
assert.equal(Core.getGlyph("binary", brightBinary.glyphs[0]), "1");

const purpleSource = new Uint8ClampedArray([106, 83, 212, 255, 106, 83, 212, 255, 106, 83, 212, 255, 106, 83, 212, 255]);

const wingdings2 = Core.createBuffers(1, 1);
const wingdings256 = Core.createBuffers(1, 1);
Core.convertInto(purpleSource, 2, 2, { glyphSet: "wingdings", colorPalette: "standard", paletteDepth: 2 }, wingdings2);
Core.convertInto(purpleSource, 2, 2, { glyphSet: "wingdings", colorPalette: "standard", paletteDepth: 256 }, wingdings256);
assert.notDeepEqual([...wingdings2.colors], [...wingdings256.colors], "Wingdings should honor palette depth");

const nativeEmoji2 = Core.createBuffers(1, 1);
const nativeEmoji256 = Core.createBuffers(1, 1);
Core.convertInto(purpleSource, 2, 2, { glyphSet: "restrictedEmoji", colorPalette: "standard", paletteDepth: 2 }, nativeEmoji2);
Core.convertInto(purpleSource, 2, 2, { glyphSet: "restrictedEmoji", colorPalette: "standard", paletteDepth: 256 }, nativeEmoji256);
assert.deepEqual([...nativeEmoji2.colors], [...nativeEmoji256.colors], "Native emoji should deliberately ignore palette depth");

const vector2 = Core.createBuffers(1, 1);
const vector256 = Core.createBuffers(1, 1);
Core.convertInto(purpleSource, 2, 2, { glyphSet: "vectorLines", colorPalette: "standard", paletteDepth: 2 }, vector2);
Core.convertInto(purpleSource, 2, 2, { glyphSet: "vectorLines", colorPalette: "standard", paletteDepth: 256 }, vector256);
assert.notDeepEqual([...vector2.colors], [...vector256.colors], "Vector Lines should honor palette depth");
assert.notDeepEqual(
  Core.quantizeColor("standard", 2, 106, 83, 212),
  Core.quantizeColor("standard", 24, 106, 83, 212),
  "Point-level vector color should honor palette depth"
);

const verticalSplit = new Uint8ClampedArray(4 * 8 * 4);
for (let y = 0; y < 8; y += 1) {
  for (let x = 0; x < 4; x += 1) {
    const offset = (y * 4 + x) * 4;
    const value = x < 2 ? 0 : 255;
    verticalSplit[offset] = value;
    verticalSplit[offset + 1] = value;
    verticalSplit[offset + 2] = value;
    verticalSplit[offset + 3] = 255;
  }
}
const videoGlyphCell = Core.createBuffers(1, 1);
Core.convertInto(verticalSplit, 4, 8, {
  glyphSet: "video64",
  colorPalette: "blackwhite",
  paletteDepth: 2,
  videoGlyphStability: 0
}, videoGlyphCell);
assert([10, 11].includes(videoGlyphCell.glyphs[0]), "A vertical split should select a half-cell mask");
const videoRow = [...videoGlyphCell.image.slice(0, Core.CELL_WIDTH * 4)].filter((_, index) => index % 4 !== 3);
assert(videoRow.slice(0, 12).every((value) => value === 0), "Dark half should remain dark");
assert(videoRow.slice(12).every((value) => value === 255), "Light half should remain light");

assert.deepEqual(Core.invertLuminanceColor(0, 0, 0), [255, 255, 255]);
assert.deepEqual(Core.invertLuminanceColor(255, 255, 255), [0, 0, 0]);

const edgeSource = new Uint8ClampedArray(16 * 16 * 4);
for (let y = 0; y < 16; y += 1) {
  for (let x = 0; x < 16; x += 1) {
    const offset = (y * 16 + x) * 4;
    const value = x < 8 ? 0 : 255;
    edgeSource[offset] = value;
    edgeSource[offset + 1] = value;
    edgeSource[offset + 2] = value;
    edgeSource[offset + 3] = 255;
  }
}
const vectorField = Core.traceVectorField(edgeSource, 16, 16, { detail: 0.7, reach: 4, points: false });
assert(vectorField.points.length >= 10, "Sobel tracing should find the synthetic vertical edge");
assert(vectorField.segments.length > 0, "Contour tracing should connect aligned edge points");
assert(vectorField.segments.every(([start, end]) => start < vectorField.points.length && end < vectorField.points.length));

const redMonochrome = Core.createBuffers(1, 1);
Core.convertInto(white, 2, 2, { colorPalette: "red", paletteDepth: "truecolor" }, redMonochrome);
assert.equal(redMonochrome.colors[1], 74);
assert.equal(redMonochrome.colors[2], 48);

console.log("ANSI Tube core tests passed.");
