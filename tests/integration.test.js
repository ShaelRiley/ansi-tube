const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../core.js");

const root = path.join(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.version, "0.4.0");

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
assert(!glyphOptions.includes("restrictedEmojiTinted"), "Restricted Tinted Emoji should be removed");
assert(!glyphOptions.includes("fullEmojiTinted"), "Full Tinted Emoji should be removed");
assert(content.includes('this.transitionPromise = Promise.resolve()'), "Toggle transitions should be serialized");
assert(content.includes("await this.waitForVideo()"), "Activation should wait briefly for YouTube video readiness");

console.log("ANSI Tube integration tests passed.");
