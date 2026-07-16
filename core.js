(function exposeAnsiTubeCore(root, factory) {
  const api = factory();
  root.AnsiTubeCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function makeAnsiTubeCore() {
  "use strict";

  const GLYPHS = [" ", "░", "▒", "▓", "█", "▄", "▌", "▐", "▀"];
  const GLYPH = Object.freeze({ SPACE: 0, LIGHT: 1, MEDIUM: 2, DARK: 3, FULL: 4, LOWER: 5, LEFT: 6, RIGHT: 7, UPPER: 8 });
  const CELL_WIDTH = 4;
  const CELL_HEIGHT = 8;

  const ANSI_16 = [
    [0, 0, 0], [170, 0, 0], [0, 170, 0], [170, 85, 0],
    [0, 0, 170], [170, 0, 170], [0, 170, 170], [170, 170, 170],
    [85, 85, 85], [255, 85, 85], [85, 255, 85], [255, 255, 85],
    [85, 85, 255], [255, 85, 255], [85, 255, 255], [255, 255, 255]
  ];

  const ANSI_32 = [
    ...ANSI_16,
    [24, 24, 24], [68, 68, 68], [118, 118, 118], [218, 218, 218],
    [128, 32, 32], [220, 64, 64], [128, 96, 24], [238, 164, 48],
    [32, 112, 56], [40, 210, 92], [24, 96, 128], [44, 190, 224],
    [44, 56, 150], [84, 106, 235], [116, 38, 142], [224, 74, 210]
  ];

  const BAYER_4X4 = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
  ];

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function computeGrid(columns, aspectRatio) {
    const safeColumns = clamp(Math.round(columns || 120), 60, 200);
    const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
    return {
      columns: safeColumns,
      rows: Math.max(1, Math.round(safeColumns / safeAspect / 2))
    };
  }

  function createBuffers(columns, rows) {
    const count = columns * rows;
    return {
      columns,
      rows,
      glyphs: new Uint8Array(count),
      colors: new Uint8ClampedArray(count * 3),
      image: new Uint8ClampedArray(columns * CELL_WIDTH * rows * CELL_HEIGHT * 4)
    };
  }

  function energy(r, g, b) {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const saturation = max === 0 ? 0 : (max - min) / max;
    return max * (0.86 + 0.14 * saturation);
  }

  function closestPaletteColor(r, g, b, palette) {
    let best = palette[0];
    let bestDistance = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const color = palette[i];
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const distance = dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = color;
      }
    }
    return best;
  }

  function chooseGlyph(e0, e1, e2, e3, thresholds) {
    const top = (e0 + e1) * 0.5;
    const bottom = (e2 + e3) * 0.5;
    const left = (e0 + e2) * 0.5;
    const right = (e1 + e3) * 0.5;
    const average = (e0 + e1 + e2 + e3) * 0.25;
    if (average < thresholds.black) return GLYPH.SPACE;

    const vertical = Math.abs(top - bottom);
    const horizontal = Math.abs(left - right);
    if (Math.max(vertical, horizontal) > thresholds.edge && Math.max(top, bottom, left, right) > 0.22) {
      if (vertical >= horizontal) return top > bottom ? GLYPH.UPPER : GLYPH.LOWER;
      return left > right ? GLYPH.LEFT : GLYPH.RIGHT;
    }
    if (average < 0.19) return GLYPH.LIGHT;
    if (average < 0.42) return GLYPH.MEDIUM;
    if (average < 0.72) return GLYPH.DARK;
    return GLYPH.FULL;
  }

  function maskAt(glyph, x, y) {
    switch (glyph) {
      case GLYPH.SPACE: return false;
      case GLYPH.FULL: return true;
      case GLYPH.LOWER: return y >= CELL_HEIGHT / 2;
      case GLYPH.UPPER: return y < CELL_HEIGHT / 2;
      case GLYPH.LEFT: return x < CELL_WIDTH / 2;
      case GLYPH.RIGHT: return x >= CELL_WIDTH / 2;
      case GLYPH.LIGHT: return BAYER_4X4[(y % 4) * 4 + x] < 4;
      case GLYPH.MEDIUM: return BAYER_4X4[(y % 4) * 4 + x] < 8;
      case GLYPH.DARK: return BAYER_4X4[(y % 4) * 4 + x] < 12;
      default: return false;
    }
  }

  function convertInto(source, width, height, settings, buffers) {
    const saturationBoost = Number(settings.saturationBoost ?? 0.42);
    const brightnessBoost = Number(settings.brightnessBoost ?? 0.17);
    const thresholds = {
      black: Number(settings.blackThreshold ?? 0.035),
      edge: Number(settings.edgeThreshold ?? 0.24)
    };
    const palette = settings.palette === "ansi16" ? ANSI_16 : settings.palette === "ansi32" ? ANSI_32 : null;
    const columns = buffers.columns;
    const rows = buffers.rows;
    const outWidth = columns * CELL_WIDTH;

    for (let cy = 0; cy < rows; cy += 1) {
      const sy = cy * 2;
      for (let cx = 0; cx < columns; cx += 1) {
        const sx = cx * 2;
        const offset0 = (sy * width + sx) * 4;
        const offset1 = offset0 + 4;
        const offset2 = ((sy + 1) * width + sx) * 4;
        const offset3 = offset2 + 4;
        const energy0 = energy(source[offset0], source[offset0 + 1], source[offset0 + 2]);
        const energy1 = energy(source[offset1], source[offset1 + 1], source[offset1 + 2]);
        const energy2 = energy(source[offset2], source[offset2 + 1], source[offset2 + 2]);
        const energy3 = energy(source[offset3], source[offset3 + 1], source[offset3 + 2]);
        const cellIndex = cy * columns + cx;
        const glyph = chooseGlyph(energy0, energy1, energy2, energy3, thresholds);
        buffers.glyphs[cellIndex] = glyph;

        const weight0 = 0.08 + energy0 * energy0;
        const weight1 = 0.08 + energy1 * energy1;
        const weight2 = 0.08 + energy2 * energy2;
        const weight3 = 0.08 + energy3 * energy3;
        const weightTotal = weight0 + weight1 + weight2 + weight3;
        let r = source[offset0] * weight0 + source[offset1] * weight1 + source[offset2] * weight2 + source[offset3] * weight3;
        let g = source[offset0 + 1] * weight0 + source[offset1 + 1] * weight1 + source[offset2 + 1] * weight2 + source[offset3 + 1] * weight3;
        let b = source[offset0 + 2] * weight0 + source[offset1 + 2] * weight1 + source[offset2 + 2] * weight2 + source[offset3 + 2] * weight3;
        r /= weightTotal; g /= weightTotal; b /= weightTotal;
        const peak = Math.max(r, g, b);
        const trough = Math.min(r, g, b);
        const saturation = peak === 0 ? 0 : (peak - trough) / peak;
        if (saturation >= 0.02) {
          const targetSaturation = clamp(saturation * (1 + saturationBoost) + 0.06, 0, 1);
          const chromaScale = targetSaturation / saturation;
          r = clamp(peak - (peak - r) * chromaScale, 0, 255);
          g = clamp(peak - (peak - g) * chromaScale, 0, 255);
          b = clamp(peak - (peak - b) * chromaScale, 0, 255);
        }
        const valueScale = peak === 0 ? 0 : Math.min(255, peak * (1 + brightnessBoost)) / peak;
        let colorR = Math.round(r * valueScale);
        let colorG = Math.round(g * valueScale);
        let colorB = Math.round(b * valueScale);
        if (palette) {
          const matched = closestPaletteColor(colorR, colorG, colorB, palette);
          colorR = matched[0];
          colorG = matched[1];
          colorB = matched[2];
        }

        const colorOffset = cellIndex * 3;
        buffers.colors[colorOffset] = colorR;
        buffers.colors[colorOffset + 1] = colorG;
        buffers.colors[colorOffset + 2] = colorB;

        for (let py = 0; py < CELL_HEIGHT; py += 1) {
          for (let px = 0; px < CELL_WIDTH; px += 1) {
            const outputOffset = ((cy * CELL_HEIGHT + py) * outWidth + cx * CELL_WIDTH + px) * 4;
            const lit = maskAt(glyph, px, py);
            buffers.image[outputOffset] = lit ? colorR : 0;
            buffers.image[outputOffset + 1] = lit ? colorG : 0;
            buffers.image[outputOffset + 2] = lit ? colorB : 0;
            buffers.image[outputOffset + 3] = 255;
          }
        }
      }
    }
    return buffers;
  }

  function sgr16(index) {
    if (index < 8) return `\u001b[${30 + index}m`;
    return `\u001b[${90 + index - 8}m`;
  }

  function buildAns(buffers, paletteMode) {
    const lines = [];
    for (let row = 0; row < buffers.rows; row += 1) {
      let line = "\u001b[48;2;0;0;0m";
      let previous = "";
      for (let column = 0; column < buffers.columns; column += 1) {
        const cell = row * buffers.columns + column;
        const colorOffset = cell * 3;
        const r = buffers.colors[colorOffset];
        const g = buffers.colors[colorOffset + 1];
        const b = buffers.colors[colorOffset + 2];
        let escape;
        if (paletteMode === "ansi16") {
          const matched = closestPaletteColor(r, g, b, ANSI_16);
          const index = ANSI_16.indexOf(matched);
          escape = `16:${index}`;
          if (escape !== previous) line += sgr16(index);
        } else {
          escape = `${r},${g},${b}`;
          if (escape !== previous) line += `\u001b[38;2;${r};${g};${b}m`;
        }
        previous = escape;
        line += GLYPHS[buffers.glyphs[cell]];
      }
      lines.push(`${line}\u001b[0m`);
    }
    return `${lines.join("\n")}\n`;
  }

  return {
    GLYPHS,
    CELL_WIDTH,
    CELL_HEIGHT,
    ANSI_16,
    ANSI_32,
    computeGrid,
    createBuffers,
    convertInto,
    buildAns
  };
});
