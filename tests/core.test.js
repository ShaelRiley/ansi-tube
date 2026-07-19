const assert = require("node:assert/strict");
const Core = require("../core.js");

const grid = Core.computeGrid(120, 16 / 9);
assert.deepEqual(grid, { columns: 120, rows: 34 });
assert.deepEqual(Core.computeGrid(120, 4 / 3), { columns: 120, rows: 45 });
assert.deepEqual(Core.computeSourceRect(1920, 1080, 4 / 3), { x: 240, y: 0, width: 1440, height: 1080 });
assert.deepEqual(Core.computeSourceRect(1920, 1080, 4 / 3, 1.25), { x: 384, y: 108, width: 1152, height: 864 });

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

const paletteStyles = [
  "standard", "blackwhite", "cga", "ega", "vga", "svga",
  "cyan", "yellow", "green", "red", "purple", "blue", "pink", "orange", "amber",
  "ice", "toxic", "sepia",
  "nes", "sms", "genesis", "c64", "apple2e", "apple2green", "gbdmg", "virtualb", "snes", "vexitrexi", "zedexspectral",
  "atari2600", "atari5200", "trash80", "oldtv", "eighties", "sunburst", "space", "psychedelic",
  "caveman", "oceania", "metallics", "silvergold", "supercomic", "hyperreal"
];
for (const style of paletteStyles) {
  for (const depth of Core.PALETTE_DEPTHS) {
    assert.equal(Core.getPaletteBundle(style, depth).palette.length, depth, `${style} should provide ${depth} colors`);
  }
}

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
assert.equal(Core.GLYPH_SETS.vectorLines.type, "vector");
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
