import { describe, expect, it } from 'vitest';

import { generatePattern, sampleImageToGridAverages } from './generator';

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
});
