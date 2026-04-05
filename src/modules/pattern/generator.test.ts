import { describe, expect, it } from 'vitest';

import { generatePattern, sampleImageToGridAverages } from './generator';
import stylizedDogFixture from './fixtures/stylized-dog-sample.json';

function createRawImage(
  width: number,
  height: number,
  colors: ReadonlyArray<readonly [number, number, number, number]>,
) {
  return {
    width,
    height,
    data: new Uint8ClampedArray(colors.flat()),
  };
}

function rgbToHsl([red, green, blue]: [number, number, number]) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
      break;
  }

  return {
    hue: hue * 60,
    saturation,
    lightness,
  };
}

function rgbLuminance([red, green, blue]: [number, number, number]) {
  return (red * 299 + green * 587 + blue * 114) / 1000;
}

function createRawImageFromFixture(fixture: { width: number; height: number; data: number[] }) {
  return {
    width: fixture.width,
    height: fixture.height,
    data: new Uint8ClampedArray(fixture.data),
  };
}

function findNonBackgroundBounds(
  pattern: ReturnType<typeof generatePattern>,
  backgroundLuminance = 230,
) {
  const bounds = {
    minX: pattern.width,
    minY: pattern.height,
    maxX: -1,
    maxY: -1,
  };

  for (let row = 0; row < pattern.height; row += 1) {
    for (let column = 0; column < pattern.width; column += 1) {
      const cell = pattern.cells[row * pattern.width + column];

      if (rgbLuminance(cell.rgb) >= backgroundLuminance) {
        continue;
      }

      bounds.minX = Math.min(bounds.minX, column);
      bounds.minY = Math.min(bounds.minY, row);
      bounds.maxX = Math.max(bounds.maxX, column);
      bounds.maxY = Math.max(bounds.maxY, row);
    }
  }

  return bounds;
}

function collectCellsWithinBounds(
  pattern: ReturnType<typeof generatePattern>,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) {
  const cells: typeof pattern.cells = [];

  for (let row = bounds.minY; row <= bounds.maxY; row += 1) {
    for (let column = bounds.minX; column <= bounds.maxX; column += 1) {
      cells.push(pattern.cells[row * pattern.width + column]);
    }
  }

  return cells;
}

describe('generatePattern', () => {
  it('averages each target region instead of inheriting a single dark source pixel', () => {
    const image = createRawImage(4, 2, [
      [220, 176, 146, 255], [220, 176, 146, 255], [74, 136, 168, 255], [74, 136, 168, 255],
      [220, 176, 146, 255], [18, 18, 18, 255], [74, 136, 168, 255], [74, 136, 168, 255],
    ]);

    const result = sampleImageToGridAverages(image, 2, 1);
    const [leftCell, rightCell] = result;
    const leftLuminance = (leftCell[0] * 299 + leftCell[1] * 587 + leftCell[2] * 114) / 1000;
    const rightLuminance = (rightCell[0] * 299 + rightCell[1] * 587 + rightCell[2] * 114) / 1000;

    expect(result).toHaveLength(2);
    expect(leftLuminance).toBeGreaterThan(120);
    expect(leftLuminance).toBeLessThan(210);
    expect(rightLuminance).toBeGreaterThan(90);
    expect(rightLuminance).toBeLessThan(160);
  });

  it('derives chart dimensions from the configured target size when given a higher-resolution sampling raster', () => {
    const pixels: Array<[number, number, number, number]> = [];

    for (let row = 0; row < 32; row += 1) {
      for (let column = 0; column < 32; column += 1) {
        pixels.push(column < 16 ? [239, 214, 189, 255] : [156, 108, 82, 255]);
      }
    }

    const image = createRawImage(32, 32, pixels);
    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 6,
      smoothLevel: 1,
    });

    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
  });

  it('maps imported pixels into the Mard palette and respects the max color limit', () => {
    const image = createRawImage(2, 2, [
      [255, 244, 200, 255],
      [247, 124, 49, 255],
      [255, 244, 200, 255],
      [247, 124, 49, 255],
    ]);

    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 2,
      smoothLevel: 0,
    });

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(new Set(result.cells.map((cell) => cell.code)).size).toBeLessThanOrEqual(2);
    expect(result.cells.every((cell) => /^#[0-9A-F]{6}$/.test(cell.hex))).toBe(true);
  });

  it('smooths away isolated noise when smooth level is raised', () => {
    const image = createRawImage(3, 3, [
      [250, 244, 200, 255],
      [250, 244, 200, 255],
      [250, 244, 200, 255],
      [250, 244, 200, 255],
      [253, 84, 61, 255],
      [250, 244, 200, 255],
      [250, 244, 200, 255],
      [250, 244, 200, 255],
      [250, 244, 200, 255],
    ]);

    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 2,
      smoothLevel: 3,
    });

    expect(result.cells[4].code).toBe(result.cells[0].code);
  });

  it('preserves dark anchor details in a face-like block instead of smoothing them away', () => {
    const skin = [244, 214, 186, 255] as const;
    const hair = [119, 83, 54, 255] as const;
    const eye = [18, 18, 18, 255] as const;
    const image = createRawImage(5, 5, [
      hair, hair, hair, hair, hair,
      skin, skin, skin, skin, skin,
      skin, eye, skin, eye, skin,
      skin, skin, skin, skin, skin,
      skin, skin, [201, 120, 98, 255], skin, skin,
    ]);

    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 4,
      smoothLevel: 2,
    });

    const darkCells = result.cells.filter((cell) => {
      const [red, green, blue] = cell.rgb;
      const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

      return luminance < 60;
    });

    expect(darkCells.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps a darkest accent color even when the palette is aggressively limited', () => {
    const image = createRawImage(4, 4, [
      [242, 219, 190, 255], [242, 219, 190, 255], [242, 219, 190, 255], [188, 140, 96, 255],
      [242, 219, 190, 255], [19, 19, 19, 255], [242, 219, 190, 255], [188, 140, 96, 255],
      [242, 219, 190, 255], [242, 219, 190, 255], [242, 219, 190, 255], [92, 148, 173, 255],
      [216, 121, 112, 255], [216, 121, 112, 255], [188, 140, 96, 255], [92, 148, 173, 255],
    ]);

    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 3,
      smoothLevel: 1,
    });

    const darkestCell = result.cells.reduce((darkest, cell) => {
      const luminance = (cell.rgb[0] * 299 + cell.rgb[1] * 587 + cell.rgb[2] * 114) / 1000;
      const darkestLuminance = (darkest.rgb[0] * 299 + darkest.rgb[1] * 587 + darkest.rgb[2] * 114) / 1000;

      return luminance < darkestLuminance ? cell : darkest;
    });

    const luminance = (darkestCell.rgb[0] * 299 + darkestCell.rgb[1] * 587 + darkestCell.rgb[2] * 114) / 1000;

    expect(luminance).toBeLessThan(55);
  });

  it('keeps multiple midtone families after converting a face-like sampling raster', () => {
    const pixels: Array<[number, number, number, number]> = [];

    for (let row = 0; row < 32; row += 1) {
      for (let column = 0; column < 32; column += 1) {
        if (row < 8) {
          pixels.push([119, 83, 54, 255]);
          continue;
        }

        if (row >= 12 && row < 16 && (column >= 8 && column < 12)) {
          pixels.push([18, 18, 18, 255]);
          continue;
        }

        if (row >= 12 && row < 16 && (column >= 20 && column < 24)) {
          pixels.push([18, 18, 18, 255]);
          continue;
        }

        if (row >= 22 && row < 26 && column >= 12 && column < 20) {
          pixels.push([201, 120, 98, 255]);
          continue;
        }

        if (row >= 24) {
          pixels.push([92, 148, 173, 255]);
          continue;
        }

        pixels.push([244, 214, 186, 255]);
      }
    }

    const image = createRawImage(32, 32, pixels);
    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 10,
      smoothLevel: 1,
    });
    const usedCodes = new Set(result.cells.map((cell) => cell.code));
    const midtoneCount = result.cells.filter((cell) => {
      const [red, green, blue] = cell.rgb;
      const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

      return luminance >= 70 && luminance <= 220;
    }).length;

    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
    expect(usedCodes.size).toBeGreaterThanOrEqual(4);
    expect(midtoneCount).toBeGreaterThan(80);
  });

  it('preserves multiple red tones when the source contains warm hue, saturation, and lightness bands', () => {
    const pixels: Array<[number, number, number, number]> = [];

    for (let row = 0; row < 24; row += 1) {
      for (let column = 0; column < 24; column += 1) {
        if (column < 6) {
          pixels.push([117, 30, 36, 255]);
          continue;
        }

        if (column < 12) {
          pixels.push([176, 39, 52, 255]);
          continue;
        }

        if (column < 18) {
          pixels.push([214, 86, 94, 255]);
          continue;
        }

        pixels.push([245, 160, 150, 255]);
      }
    }

    const image = createRawImage(24, 24, pixels);
    const result = generatePattern(image, {
      targetSize: 24,
      maxColors: 16,
      smoothLevel: 0,
    });
    const warmCodes = new Set(
      result.cells
        .filter((cell) => {
          const { hue, saturation, lightness } = rgbToHsl(cell.rgb);

          return saturation >= 0.12 && lightness >= 0.15 && lightness <= 0.9 && (hue <= 32 || hue >= 330);
        })
        .map((cell) => cell.code),
    );

    expect(warmCodes.size).toBeGreaterThanOrEqual(3);
  });

  it('does not collapse all warm reds into a single palette code when colors are moderately limited', () => {
    const pixels: Array<[number, number, number, number]> = [];

    for (let row = 0; row < 24; row += 1) {
      for (let column = 0; column < 24; column += 1) {
        if (row < 8) {
          pixels.push(column < 12 ? [121, 25, 31, 255] : [170, 43, 51, 255]);
          continue;
        }

        if (row < 16) {
          pixels.push(column < 12 ? [202, 74, 76, 255] : [240, 122, 105, 255]);
          continue;
        }

        pixels.push(column < 12 ? [206, 157, 143, 255] : [104, 121, 145, 255]);
      }
    }

    const image = createRawImage(24, 24, pixels);
    const result = generatePattern(image, {
      targetSize: 24,
      maxColors: 8,
      smoothLevel: 0,
    });
    const warmCodes = new Set(
      result.cells
        .filter((cell) => {
          const { hue, saturation } = rgbToHsl(cell.rgb);

          return saturation >= 0.18 && (hue <= 28 || hue >= 340);
        })
        .map((cell) => cell.code),
    );

    expect(warmCodes.size).toBeGreaterThanOrEqual(2);
  });

  it('keeps four warm lightness bands separated when the full Mard palette is available', () => {
    const pixels: Array<[number, number, number, number]> = [];
    const warmBands: Array<[number, number, number, number]> = [
      [104, 22, 28, 255],
      [152, 33, 45, 255],
      [205, 75, 82, 255],
      [241, 153, 145, 255],
    ];

    for (let row = 0; row < 8; row += 1) {
      for (const band of warmBands) {
        for (let column = 0; column < 8; column += 1) {
          pixels.push(band);
        }
      }
    }

    const image = createRawImage(32, 8, pixels);
    const result = generatePattern(image, {
      targetSize: 32,
      maxColors: 221,
      smoothLevel: 0,
    });
    const sampleCodes = [3, 11, 19, 27].map((column) => result.cells[4 * result.width + column]);
    const sampleLuminances = sampleCodes.map((cell) => (cell.rgb[0] * 299 + cell.rgb[1] * 587 + cell.rgb[2] * 114) / 1000);

    expect(new Set(sampleCodes.map((cell) => cell.code)).size).toBe(4);
    expect(sampleLuminances[0]).toBeLessThan(sampleLuminances[1]);
    expect(sampleLuminances[1]).toBeLessThan(sampleLuminances[2]);
    expect(sampleLuminances[2]).toBeLessThan(sampleLuminances[3]);
  });

  it('expands subtle warm gradients into at least three palette steps instead of collapsing them', () => {
    const pixels: Array<[number, number, number, number]> = [];
    const warmBands: Array<[number, number, number, number]> = [
      [134, 35, 42, 255],
      [154, 48, 54, 255],
      [176, 62, 67, 255],
      [198, 78, 83, 255],
    ];

    for (let row = 0; row < 10; row += 1) {
      for (const band of warmBands) {
        for (let column = 0; column < 6; column += 1) {
          pixels.push(band);
        }
      }
    }

    const image = createRawImage(24, 10, pixels);
    const result = generatePattern(image, {
      targetSize: 24,
      maxColors: 221,
      smoothLevel: 0,
    });
    const sampleCodes = [2, 8, 14, 20].map((column) => result.cells[5 * result.width + column].code);

    expect(new Set(sampleCodes).size).toBeGreaterThanOrEqual(3);
  });

  it('preserves a bright eye catchlight inside a dark eye cluster instead of flattening the whole eye to black', () => {
    const pixels: Array<[number, number, number, number]> = [];

    for (let row = 0; row < 64; row += 1) {
      for (let column = 0; column < 64; column += 1) {
        let pixel: [number, number, number, number] = [214, 196, 174, 255];

        if (row >= 16 && row < 48 && column >= 16 && column < 48) {
          pixel = [108, 88, 70, 255];
        }

        if (row >= 24 && row < 40 && column >= 24 && column < 40) {
          pixel = [18, 18, 18, 255];
        }

        if (row >= 24 && row < 32 && column >= 24 && column < 32) {
          pixel = [248, 248, 248, 255];
        }

        pixels.push(pixel);
      }
    }

    const image = createRawImage(64, 64, pixels);
    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 221,
      smoothLevel: 0,
    });
    const eyeRows = [6, 7, 8, 9];
    const eyeColumns = [6, 7, 8, 9];
    const eyeCells = eyeRows.flatMap((row) => eyeColumns.map((column) => result.cells[row * result.width + column]));
    const eyeLuminances = eyeCells.map((cell) => (cell.rgb[0] * 299 + cell.rgb[1] * 587 + cell.rgb[2] * 114) / 1000);

    expect(Math.max(...eyeLuminances)).toBeGreaterThanOrEqual(175);
    expect(Math.min(...eyeLuminances)).toBeLessThanOrEqual(65);
  });

  it('preserves a dark outline band between subject and light background instead of averaging it away', () => {
    const pixels: Array<[number, number, number, number]> = [];

    for (let row = 0; row < 64; row += 1) {
      for (let column = 0; column < 64; column += 1) {
        let pixel: [number, number, number, number];

        if (column < 29) {
          pixel = [178, 132, 96, 255];
        } else if (column < 35) {
          pixel = [28, 24, 22, 255];
        } else {
          pixel = [238, 232, 214, 255];
        }

        pixels.push(pixel);
      }
    }

    const image = createRawImage(64, 64, pixels);
    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 221,
      smoothLevel: 0,
    });
    const centerRow = 8;
    const leftCell = result.cells[centerRow * result.width + 6];
    const edgeLeftCell = result.cells[centerRow * result.width + 7];
    const edgeRightCell = result.cells[centerRow * result.width + 8];
    const rightCell = result.cells[centerRow * result.width + 9];
    const leftLuminance = (leftCell.rgb[0] * 299 + leftCell.rgb[1] * 587 + leftCell.rgb[2] * 114) / 1000;
    const edgeLuminance = Math.min(
      (edgeLeftCell.rgb[0] * 299 + edgeLeftCell.rgb[1] * 587 + edgeLeftCell.rgb[2] * 114) / 1000,
      (edgeRightCell.rgb[0] * 299 + edgeRightCell.rgb[1] * 587 + edgeRightCell.rgb[2] * 114) / 1000,
    );
    const rightLuminance = (rightCell.rgb[0] * 299 + rightCell.rgb[1] * 587 + rightCell.rgb[2] * 114) / 1000;

    expect(leftLuminance - edgeLuminance).toBeGreaterThanOrEqual(35);
    expect(rightLuminance - edgeLuminance).toBeGreaterThanOrEqual(95);
  });

  it('compresses a thick dark silhouette ring into a thin contour instead of keeping a two-cell black border', () => {
    const pixels: Array<[number, number, number, number]> = [];

    for (let row = 0; row < 64; row += 1) {
      for (let column = 0; column < 64; column += 1) {
        let pixel: [number, number, number, number] = [248, 244, 232, 255];

        if (row >= 8 && row < 56 && column >= 8 && column < 56) {
          pixel = [34, 28, 24, 255];
        }

        if (row >= 16 && row < 48 && column >= 16 && column < 48) {
          pixel = [198, 122, 56, 255];
        }

        pixels.push(pixel);
      }
    }

    const image = createRawImage(64, 64, pixels);
    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 221,
      smoothLevel: 0,
    });
    const centerRow = 8;
    const outerLeft = result.cells[centerRow * result.width + 2];
    const innerLeft = result.cells[centerRow * result.width + 3];
    const innerRight = result.cells[centerRow * result.width + 12];
    const outerRight = result.cells[centerRow * result.width + 13];
    const outerLeftLuminance = rgbLuminance(outerLeft.rgb);
    const innerLeftLuminance = rgbLuminance(innerLeft.rgb);
    const innerRightLuminance = rgbLuminance(innerRight.rgb);
    const outerRightLuminance = rgbLuminance(outerRight.rgb);

    expect(innerLeftLuminance - outerLeftLuminance).toBeGreaterThanOrEqual(40);
    expect(innerRightLuminance - outerRightLuminance).toBeGreaterThanOrEqual(40);
    expect(innerLeftLuminance).toBeGreaterThanOrEqual(85);
    expect(innerRightLuminance).toBeGreaterThanOrEqual(85);
  });

  it('keeps an internal warm seam in the warm family instead of promoting it to a black outline', () => {
    const pixels: Array<[number, number, number, number]> = [];

    for (let row = 0; row < 64; row += 1) {
      for (let column = 0; column < 64; column += 1) {
        let pixel: [number, number, number, number];

        if (column < 30) {
          pixel = [196, 118, 52, 255];
        } else if (column < 34) {
          pixel = [78, 42, 18, 255];
        } else {
          pixel = [246, 226, 194, 255];
        }

        pixels.push(pixel);
      }
    }

    const image = createRawImage(64, 64, pixels);
    const result = generatePattern(image, {
      targetSize: 16,
      maxColors: 221,
      smoothLevel: 0,
    });
    const centerRow = 8;
    const seamCells = [7, 8].map((column) => result.cells[centerRow * result.width + column]);
    const seamLuminances = seamCells.map((cell) => rgbLuminance(cell.rgb));
    const seamHues = seamCells.map((cell) => rgbToHsl(cell.rgb).hue);
    const seamSaturations = seamCells.map((cell) => rgbToHsl(cell.rgb).saturation);

    expect(Math.min(...seamLuminances)).toBeGreaterThanOrEqual(42);
    expect(seamSaturations.every((saturation) => saturation >= 0.18)).toBe(true);
    expect(
      seamHues.every((hue) => {
        return hue <= 35 || hue >= 330;
      }),
    ).toBe(true);
  });

  it('does not exhaust a moderate color budget on the stylized dog sample', () => {
    const image = createRawImageFromFixture(stylizedDogFixture);
    const result = generatePattern(image, {
      targetSize: 24,
      maxColors: 48,
      smoothLevel: 0,
    });
    const usedCodes = new Set(result.cells.map((cell) => cell.code));

    expect(result.width).toBe(24);
    expect(usedCodes.size).toBeLessThanOrEqual(32);
  });

  it('suppresses cool anti-aliasing noise inside the stylized dog face', () => {
    const image = createRawImageFromFixture(stylizedDogFixture);
    const result = generatePattern(image, {
      targetSize: 24,
      maxColors: 48,
      smoothLevel: 0,
    });
    const bounds = findNonBackgroundBounds(result);
    const faceCells = collectCellsWithinBounds(result, bounds);
    const coolNoiseCells = faceCells.filter((cell) => {
      const { hue, saturation, lightness } = rgbToHsl(cell.rgb);

      return saturation >= 0.18 && lightness >= 0.2 && lightness <= 0.88 && hue >= 140 && hue <= 260;
    }).length;

    expect(coolNoiseCells).toBeLessThanOrEqual(28);
  });
});
