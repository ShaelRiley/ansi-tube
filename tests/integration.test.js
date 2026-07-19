const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../core.js");

const root = path.join(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.version, "0.6.0");

for (const resource of [
  ...manifest.content_scripts.flatMap((entry) => [...entry.js, ...entry.css]),
  ...manifest.web_accessible_resources.flatMap((entry) => entry.resources)
]) {
  assert(fs.existsSync(path.join(root, resource)), `Manifest resource ${resource} should exist`);
}

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
for (const depth of ["6", "12", "24", "48", "96"]) {
  assert(optionValues("ansi-tube-depth").includes(depth), `${depth}-color depth should appear in the menu`);
}
assert(!glyphOptions.includes("restrictedEmojiTinted"), "Restricted Tinted Emoji should be removed");
assert(!glyphOptions.includes("fullEmojiTinted"), "Full Tinted Emoji should be removed");
assert(content.includes('this.transitionPromise = Promise.resolve()'), "Toggle transitions should be serialized");
assert(content.includes("await this.waitForVideo()"), "Activation should wait briefly for YouTube video readiness");
assert(content.includes('data-setting="crop43"'), "4:3 crop should be independently toggleable");
assert(content.includes('data-setting="zoom43"'), "4:3 zoom should be independently toggleable");
assert(content.includes("Core.CELL_WIDTH - 1"), "CJK text should be constrained to each cell width");
assert(content.includes("setControlDisabled(palette, nativeEmoji)"), "Palette state should be explicitly restored after native emoji");
assert(content.includes("Core.traceVectorField"), "Vector mode should use contour-oriented core tracing");
assert(content.includes('data-setting="vectorSampleScale"'), "Vector sampling fidelity should be adjustable");
assert(content.includes('data-setting="vectorEdgeDetail"'), "Vector edge detail should be adjustable");
assert(content.includes('data-setting="vectorLineReach"'), "Vector line reach should be adjustable");
assert(content.includes('data-setting="vectorLineWidth"'), "Vector line width should be adjustable");
assert(content.includes('data-setting="vectorPointSize"'), "Vector point size should be adjustable");
assert(content.includes('data-setting="vectorPoints"'), "Vector point nodes should be toggleable");
assert(!content.includes("setControlDisabled(depth, nativeEmoji || vectorLines)"), "Vector mode should leave palette depth available");

console.log("ANSI Tube integration tests passed.");
