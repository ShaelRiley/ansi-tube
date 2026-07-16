const assert = require("node:assert/strict");
const Core = require("../core.js");

const grid = Core.computeGrid(120, 16 / 9);
assert.deepEqual(grid, { columns: 120, rows: 34 });

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

console.log("ANSI Tube core tests passed.");
