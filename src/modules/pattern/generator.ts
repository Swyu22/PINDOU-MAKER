/**
 * input: Browser image files or raw RGBA rasters plus generator config.
 * output: Palette-constrained bead patterns sampled from grid regions.
 * pos: Core transformation pipeline from imported picture to editable bead pattern.
 */
import { MARD_221_BY_CODE, MARD_221_PALETTE, type PaletteColor } from '../palette/mard221';
import type { GeneratorConfig, PatternDocument, RawImageDataLike } from './types';

type LabColor = {
  l: number;
  a: number;
  b: number;
};

type HslColor = {
  h: number;
  s: number;
  l: number;
};

type PaletteEntryWithLab = PaletteColor & {
  lab: LabColor;
  hsl: HslColor;
  luminance: number;
};

type SourceColorProfile = {
  rgb: [number, number, number];
  lab: LabColor;
  hsl: HslColor;
  luminance: number;
  familyKey: string;
};

type ComponentRange = {
  low: number;
  high: number;
};

type SourceFamilyStats = {
  saturation: ComponentRange;
  lightness: ComponentRange;
};

const PALETTE_WITH_LAB: PaletteEntryWithLab[] = MARD_221_PALETTE.map((entry) => ({
  ...entry,
  lab: rgbToLab(entry.rgb),
  hsl: rgbToHsl(entry.rgb),
  luminance: luminanceFromRgb(entry.rgb),
}));

const REGION_SAMPLE_SCALE = 12;

export async function loadImageFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function rasterizeImageToRawData(image: HTMLImageElement, targetSize: number): RawImageDataLike {
  const gridTarget = fitWithinTarget(image.naturalWidth || image.width, image.naturalHeight || image.height, targetSize);
  const rasterTarget = {
    width: Math.max(gridTarget.width, gridTarget.width * REGION_SAMPLE_SCALE),
    height: Math.max(gridTarget.height, gridTarget.height * REGION_SAMPLE_SCALE),
  };
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('当前浏览器无法创建图片处理画布。');
  }

  canvas.width = rasterTarget.width;
  canvas.height = rasterTarget.height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, rasterTarget.width, rasterTarget.height);

  return context.getImageData(0, 0, rasterTarget.width, rasterTarget.height);
}

export function fitWithinTarget(sourceWidth: number, sourceHeight: number, targetSize: number) {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: targetSize, height: targetSize };
  }

  if (sourceWidth >= sourceHeight) {
    return {
      width: targetSize,
      height: Math.max(1, Math.round((sourceHeight / sourceWidth) * targetSize)),
    };
  }

  return {
    width: Math.max(1, Math.round((sourceWidth / sourceHeight) * targetSize)),
    height: targetSize,
  };
}

export function generatePattern(
  image: RawImageDataLike,
  config: Pick<GeneratorConfig, 'targetSize' | 'maxColors' | 'smoothLevel'>,
): PatternDocument {
  const gridSize = resolvePatternGridSize(image.width, image.height, config.targetSize);
  const representativeColors = sampleImageToGridAverages(image, gridSize.width, gridSize.height);
  const representativeProfiles = representativeColors.map((rgb) => createSourceColorProfile(rgb));
  const sourceFamilyStats = buildSourceFamilyStats(representativeProfiles);
  const initialCells = representativeProfiles.map((profile) => findNearestPalette(profile, PALETTE_WITH_LAB, sourceFamilyStats));
  const { cells: limitedCells, protectedCodes } = limitColors(
    initialCells,
    Math.min(PALETTE_WITH_LAB.length, Math.max(2, config.maxColors)),
  );
  const smoothedCells = smoothCells(limitedCells, gridSize.width, gridSize.height, config.smoothLevel, protectedCodes);

  return {
    width: gridSize.width,
    height: gridSize.height,
    cells: smoothedCells.map((entry) => ({
      code: entry.code,
      hex: entry.hex,
      name: entry.name,
      rgb: entry.rgb,
    })),
  };
}

export function sampleImageToGridAverages(
  image: RawImageDataLike,
  gridWidth: number,
  gridHeight: number,
): Array<[number, number, number]> {
  const cells: Array<[number, number, number]> = [];

  for (let row = 0; row < gridHeight; row += 1) {
    const startY = Math.floor((row * image.height) / gridHeight);
    const endY = row === gridHeight - 1 ? image.height : Math.max(startY + 1, Math.floor(((row + 1) * image.height) / gridHeight));

    for (let column = 0; column < gridWidth; column += 1) {
      const startX = Math.floor((column * image.width) / gridWidth);
      const endX =
        column === gridWidth - 1 ? image.width : Math.max(startX + 1, Math.floor(((column + 1) * image.width) / gridWidth));
      let red = 0;
      let green = 0;
      let blue = 0;
      let totalWeight = 0;

      for (let sampleY = startY; sampleY < endY; sampleY += 1) {
        for (let sampleX = startX; sampleX < endX; sampleX += 1) {
          const sampleIndex = (sampleY * image.width + sampleX) * 4;
          const alpha = image.data[sampleIndex + 3];
          const [sampleRed, sampleGreen, sampleBlue] = normalizeTransparentPixel(
            [image.data[sampleIndex], image.data[sampleIndex + 1], image.data[sampleIndex + 2]],
            alpha,
          );
          const weight = alpha < 16 ? 1 : Math.max(alpha / 255, 0.35);

          red += srgbChannelToLinear(sampleRed) * weight;
          green += srgbChannelToLinear(sampleGreen) * weight;
          blue += srgbChannelToLinear(sampleBlue) * weight;
          totalWeight += weight;
        }
      }

      cells.push([
        linearChannelToSrgb(red / Math.max(1, totalWeight)),
        linearChannelToSrgb(green / Math.max(1, totalWeight)),
        linearChannelToSrgb(blue / Math.max(1, totalWeight)),
      ]);
    }
  }

  return cells;
}

function createSourceColorProfile(rgb: [number, number, number]): SourceColorProfile {
  const hsl = rgbToHsl(rgb);

  return {
    rgb,
    lab: rgbToLab(rgb),
    hsl,
    luminance: luminanceFromRgb(rgb),
    familyKey: createSourceFamilyKey(hsl),
  };
}

function buildSourceFamilyStats(profiles: SourceColorProfile[]) {
  const buckets = new Map<string, { saturations: number[]; lightnesses: number[] }>();

  for (const profile of profiles) {
    const bucket = buckets.get(profile.familyKey);

    if (bucket === undefined) {
      buckets.set(profile.familyKey, {
        saturations: [profile.hsl.s],
        lightnesses: [profile.hsl.l],
      });
      continue;
    }

    bucket.saturations.push(profile.hsl.s);
    bucket.lightnesses.push(profile.hsl.l);
  }

  const stats = new Map<string, SourceFamilyStats>();

  for (const [key, bucket] of buckets.entries()) {
    stats.set(key, {
      saturation: summarizeComponentRange(bucket.saturations, 0.04),
      lightness: summarizeComponentRange(bucket.lightnesses, 0.06),
    });
  }

  return stats;
}

export function replacePatternCell(pattern: PatternDocument, index: number, code: string): PatternDocument {
  const replacement = MARD_221_BY_CODE.get(code);

  if (replacement === undefined) {
    return pattern;
  }

  return {
    ...pattern,
    cells: pattern.cells.map((cell, cellIndex) =>
      cellIndex === index
        ? {
            code: replacement.code,
            hex: replacement.hex,
            name: replacement.name,
            rgb: replacement.rgb,
          }
        : cell,
    ),
  };
}

function resolvePatternGridSize(sourceWidth: number, sourceHeight: number, targetSize: number) {
  if (sourceWidth <= targetSize && sourceHeight <= targetSize) {
    return {
      width: Math.max(1, sourceWidth),
      height: Math.max(1, sourceHeight),
    };
  }

  return fitWithinTarget(sourceWidth, sourceHeight, targetSize);
}

function limitColors(cells: PaletteEntryWithLab[], maxColors: number) {
  const counts = new Map<string, number>();

  for (const cell of cells) {
    counts.set(cell.code, (counts.get(cell.code) ?? 0) + 1);
  }

  if (counts.size <= maxColors) {
    const protectedCodes = identifyProtectedAccentCodes(cells, counts);

    return {
      cells,
      protectedCodes,
    };
  }

  const protectedCodes = identifyProtectedAccentCodes(cells, counts);
  const sceneAverageLuminance = averageLuminance(cells);
  const usage = [...counts.entries()]
    .map(([code, count]) => {
      const entry = PALETTE_WITH_LAB.find((candidate) => candidate.code === code);

      if (entry === undefined) {
        return null;
      }

      return {
        code,
        count,
        entry,
        bucket: createColorBucket(entry),
        contrast: Math.abs(entry.luminance - sceneAverageLuminance),
      };
    })
    .filter(
      (
        entry,
      ): entry is { code: string; count: number; entry: PaletteEntryWithLab; bucket: string; contrast: number } => entry !== null,
    );
  const selected = new Map<string, PaletteEntryWithLab>();

  for (const code of protectedCodes) {
    const entry = PALETTE_WITH_LAB.find((candidate) => candidate.code === code);

    if (entry !== undefined && selected.size < maxColors) {
      selected.set(entry.code, entry);
    }
  }

  const bucketRepresentatives = new Map<
    string,
    { code: string; count: number; entry: PaletteEntryWithLab; bucket: string; contrast: number }
  >();

  for (const item of usage) {
    if (selected.has(item.code)) {
      continue;
    }

    const current = bucketRepresentatives.get(item.bucket);

    if (
      current === undefined ||
      item.count > current.count ||
      (item.count === current.count && item.entry.hsl.s > current.entry.hsl.s) ||
      (item.count === current.count && item.entry.hsl.s === current.entry.hsl.s && item.contrast > current.contrast)
    ) {
      bucketRepresentatives.set(item.bucket, item);
    }
  }

  const bucketCandidates = [...bucketRepresentatives.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    if (right.entry.hsl.s !== left.entry.hsl.s) {
      return right.entry.hsl.s - left.entry.hsl.s;
    }

    return right.contrast - left.contrast;
  });

  for (const candidate of bucketCandidates) {
    if (selected.size >= maxColors) {
      break;
    }

    selected.set(candidate.code, candidate.entry);
  }

  const remainingCandidates = usage
    .filter((item) => !selected.has(item.code))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      if (right.entry.hsl.s !== left.entry.hsl.s) {
        return right.entry.hsl.s - left.entry.hsl.s;
      }

      return right.contrast - left.contrast;
    });

  for (const candidate of remainingCandidates) {
    if (selected.size >= maxColors) {
      break;
    }

    selected.set(candidate.code, candidate.entry);
  }

  const limitedPalette = [...selected.values()];
  const retainedProtectedCodes = new Set([...protectedCodes].filter((code) => selected.has(code)));

  return {
    cells: cells.map((cell) =>
      selected.has(cell.code)
        ? cell
        : findNearestPalette(
            {
              rgb: cell.rgb,
              lab: cell.lab,
              hsl: cell.hsl,
              luminance: cell.luminance,
            },
            limitedPalette,
          ),
    ),
    protectedCodes: retainedProtectedCodes,
  };
}

function smoothCells(cells: PaletteEntryWithLab[], width: number, height: number, smoothLevel: number, protectedCodes: Set<string>) {
  if (smoothLevel <= 0) {
    return cells;
  }

  let current = [...cells];

  for (let pass = 0; pass < smoothLevel; pass += 1) {
    const next = [...current];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const neighborCounts = new Map<string, { count: number; entry: PaletteEntryWithLab }>();

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) {
              continue;
            }

            const neighborX = x + offsetX;
            const neighborY = y + offsetY;

            if (neighborX < 0 || neighborY < 0 || neighborX >= width || neighborY >= height) {
              continue;
            }

            const neighbor = current[neighborY * width + neighborX];
            const state = neighborCounts.get(neighbor.code);

            if (state === undefined) {
              neighborCounts.set(neighbor.code, { count: 1, entry: neighbor });
            } else {
              state.count += 1;
            }
          }
        }

        const dominant = [...neighborCounts.values()].sort((left, right) => right.count - left.count)[0];
        const currentSupport = neighborCounts.get(current[index].code)?.count ?? 0;

        if (dominant === undefined || dominant.entry.code === current[index].code) {
          continue;
        }

        const currentLuminance = luminanceFromRgb(current[index].rgb);
        const dominantLuminance = luminanceFromRgb(dominant.entry.rgb);
        const isProtectedDarkAccent =
          protectedCodes.has(current[index].code) &&
          currentLuminance <= 75 &&
          dominantLuminance - currentLuminance >= 42;

        if (isProtectedDarkAccent) {
          continue;
        }

        if (currentSupport === 0 && dominant.count >= 5) {
          next[index] = dominant.entry;
          continue;
        }

        if (currentSupport <= 1 && dominant.count >= 6) {
          next[index] = dominant.entry;
        }
      }
    }

    current = next;
  }

  return current;
}

function findNearestPalette(
  profile: SourceColorProfile | { rgb: [number, number, number]; hsl: HslColor; lab: LabColor; luminance: number; familyKey?: string },
  palette: PaletteEntryWithLab[],
  sourceFamilyStats?: Map<string, SourceFamilyStats>,
) {
  const adaptedProfile = adaptSourceProfileToPalette(profile, palette, sourceFamilyStats);
  const candidatePalette = narrowPaletteByHue(adaptedProfile.hsl, palette);
  let best = palette[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entry of candidatePalette) {
    const distance = paletteDistance(adaptedProfile.lab, adaptedProfile.hsl, adaptedProfile.luminance, entry);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }

  return best;
}

function normalizeTransparentPixel(rgb: [number, number, number], alpha: number): [number, number, number] {
  return alpha >= 16 ? rgb : [255, 255, 255];
}

function paletteDistance(targetLab: LabColor, targetHsl: HslColor, targetLuminance: number, entry: PaletteEntryWithLab) {
  const labDistance = deltaLab(targetLab, entry.lab);
  const hueDistance = circularHueDistance(targetHsl.h, entry.hsl.h) / 180;
  const saturationDistance = Math.abs(targetHsl.s - entry.hsl.s);
  const lightnessDistance = Math.abs(targetHsl.l - entry.hsl.l);
  const luminanceDistance = Math.abs(targetLuminance - entry.luminance) / 255;
  const chromaWeight = Math.max(Math.min(targetHsl.s, entry.hsl.s), 0.08);
  const huePenalty = targetHsl.s >= 0.18 && entry.hsl.s >= 0.18 ? hueDistance * (24 + chromaWeight * 28) : 0;

  return labDistance * 0.7 + huePenalty + saturationDistance * 28 + lightnessDistance * 36 + luminanceDistance * 20;
}

function circularHueDistance(left: number, right: number) {
  const distance = Math.abs(left - right);

  return Math.min(distance, 360 - distance);
}

function narrowPaletteByHue(targetHsl: HslColor, palette: PaletteEntryWithLab[]) {
  if (targetHsl.s < 0.1) {
    const neutralPalette = palette.filter((entry) => entry.hsl.s < 0.18);

    return neutralPalette.length >= 8 ? neutralPalette : palette;
  }

  const tightPalette = palette.filter(
    (entry) => entry.hsl.s >= 0.08 && circularHueDistance(targetHsl.h, entry.hsl.h) <= 18,
  );

  if (tightPalette.length >= 4) {
    return tightPalette;
  }

  const mediumPalette = palette.filter(
    (entry) => entry.hsl.s >= 0.06 && circularHueDistance(targetHsl.h, entry.hsl.h) <= 32,
  );

  if (mediumPalette.length >= 4) {
    return mediumPalette;
  }

  return palette;
}

function adaptSourceProfileToPalette(
  profile: { rgb: [number, number, number]; hsl: HslColor; lab: LabColor; luminance: number; familyKey?: string },
  palette: PaletteEntryWithLab[],
  sourceFamilyStats?: Map<string, SourceFamilyStats>,
) {
  if (profile.familyKey === undefined || sourceFamilyStats === undefined || profile.hsl.s < 0.12) {
    return profile;
  }

  const familyStats = sourceFamilyStats.get(profile.familyKey);

  if (familyStats === undefined) {
    return profile;
  }

  const familyPalette = narrowPaletteByHue(profile.hsl, palette).filter((entry) => entry.hsl.s >= 0.08);

  if (familyPalette.length < 4) {
    return profile;
  }

  const paletteSaturation = summarizeComponentRange(
    familyPalette.map((entry) => entry.hsl.s),
    0.08,
  );
  const paletteLightness = summarizeComponentRange(
    familyPalette.map((entry) => entry.hsl.l),
    0.08,
  );
  const adaptedHsl = {
    h: profile.hsl.h,
    s: remapComponentIntoRange(profile.hsl.s, familyStats.saturation, paletteSaturation, 1.18),
    l: remapComponentIntoRange(profile.hsl.l, familyStats.lightness, paletteLightness, 1.14),
  };
  const adaptedRgb = hslToRgb(adaptedHsl);

  return {
    ...profile,
    rgb: adaptedRgb,
    hsl: adaptedHsl,
    lab: rgbToLab(adaptedRgb),
    luminance: luminanceFromRgb(adaptedRgb),
  };
}

function createSourceFamilyKey(hsl: HslColor) {
  if (hsl.s < 0.12) {
    return `neutral-${Math.min(4, Math.floor(hsl.l * 5))}`;
  }

  return `hue-${Math.floor(((hsl.h + 15) % 360) / 30)}`;
}

function summarizeComponentRange(values: number[], minimumSpan: number): ComponentRange {
  if (values.length === 0) {
    return {
      low: 0,
      high: 1,
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const low = percentile(sorted, 0.1);
  const high = percentile(sorted, 0.9);

  if (high - low >= minimumSpan) {
    return { low, high };
  }

  const center = percentile(sorted, 0.5);
  const halfSpan = minimumSpan / 2;

  return {
    low: Math.max(0, center - halfSpan),
    high: Math.min(1, center + halfSpan),
  };
}

function percentile(sortedValues: number[], ratio: number) {
  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const index = (sortedValues.length - 1) * ratio;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

function remapComponentIntoRange(value: number, source: ComponentRange, target: ComponentRange, expansion: number) {
  const sourceSpan = Math.max(source.high - source.low, 0.0001);
  const targetSpan = Math.max(target.high - target.low, 0.0001);
  const normalized = clamp01((value - source.low) / sourceSpan);
  const expanded = clamp01(0.5 + (normalized - 0.5) * expansion);

  return clamp01(target.low + expanded * targetSpan);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function srgbChannelToLinear(channel: number) {
  const normalized = channel / 255;

  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function linearChannelToSrgb(value: number) {
  const normalized = Math.min(1, Math.max(0, value));
  const srgb = normalized <= 0.0031308 ? normalized * 12.92 : 1.055 * normalized ** (1 / 2.4) - 0.055;

  return Math.round(srgb * 255);
}

function rgbToLab([red, green, blue]: [number, number, number]): LabColor {
  const [x, y, z] = rgbToXyz(red, green, blue);
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;
  const normalizedX = pivotLab(x / refX);
  const normalizedY = pivotLab(y / refY);
  const normalizedZ = pivotLab(z / refZ);

  return {
    l: 116 * normalizedY - 16,
    a: 500 * (normalizedX - normalizedY),
    b: 200 * (normalizedY - normalizedZ),
  };
}

function rgbToHsl([red, green, blue]: [number, number, number]): HslColor {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return {
      h: 0,
      s: 0,
      l: lightness,
    };
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
    h: hue * 60,
    s: saturation,
    l: lightness,
  };
}

function hslToRgb({ h, s, l }: HslColor): [number, number, number] {
  if (s === 0) {
    const value = Math.round(l * 255);

    return [value, value, value];
  }

  const hueToChannel = (p: number, q: number, t: number) => {
    let adjusted = t;

    if (adjusted < 0) {
      adjusted += 1;
    }

    if (adjusted > 1) {
      adjusted -= 1;
    }

    if (adjusted < 1 / 6) {
      return p + (q - p) * 6 * adjusted;
    }

    if (adjusted < 1 / 2) {
      return q;
    }

    if (adjusted < 2 / 3) {
      return p + (q - p) * (2 / 3 - adjusted) * 6;
    }

    return p;
  };
  const normalizedHue = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hueToChannel(p, q, normalizedHue + 1 / 3) * 255),
    Math.round(hueToChannel(p, q, normalizedHue) * 255),
    Math.round(hueToChannel(p, q, normalizedHue - 1 / 3) * 255),
  ];
}

function rgbToXyz(red: number, green: number, blue: number) {
  const r = pivotRgb(red / 255);
  const g = pivotRgb(green / 255);
  const b = pivotRgb(blue / 255);

  return [
    (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100,
    (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100,
    (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100,
  ] as const;
}

function pivotRgb(value: number) {
  return value > 0.04045 ? ((value + 0.055) / 1.055) ** 2.4 : value / 12.92;
}

function pivotLab(value: number) {
  return value > 0.008856 ? value ** (1 / 3) : 7.787 * value + 16 / 116;
}

function deltaLab(left: LabColor, right: LabColor) {
  return Math.sqrt((left.l - right.l) ** 2 + (left.a - right.a) ** 2 + (left.b - right.b) ** 2);
}

function identifyProtectedAccentCodes(cells: PaletteEntryWithLab[], counts: Map<string, number>) {
  const total = cells.length;
  const weightedAverageLuminance = averageLuminance(cells);
  const usage = [...counts.entries()]
    .map(([code, count]) => {
      const entry = PALETTE_WITH_LAB.find((candidate) => candidate.code === code);

      if (entry === undefined) {
        return null;
      }

      const luminance = luminanceFromRgb(entry.rgb);

      return {
        code,
        count,
        luminance,
        contrast: Math.abs(luminance - weightedAverageLuminance),
      };
    })
    .filter((entry): entry is { code: string; count: number; luminance: number; contrast: number } => entry !== null)
    .filter((entry) => entry.count <= Math.max(3, Math.ceil(total * 0.08)))
    .filter((entry) => entry.luminance <= 65 && entry.contrast >= 65)
    .sort((left, right) => {
      if (left.luminance !== right.luminance) {
        return left.luminance - right.luminance;
      }

      return right.contrast - left.contrast;
    })
    .slice(0, 2);

  return new Set(usage.map((entry) => entry.code));
}

function averageLuminance(cells: Array<{ rgb: [number, number, number] }>) {
  return cells.reduce((sum, cell) => sum + luminanceFromRgb(cell.rgb), 0) / Math.max(1, cells.length);
}

function createColorBucket(entry: PaletteEntryWithLab) {
  if (entry.hsl.s < 0.12) {
    return `neutral-${Math.min(4, Math.floor(entry.hsl.l * 5))}`;
  }

  const hueBucket = Math.floor((((entry.hsl.h + 10) % 360) / 20));
  const saturationBucket = Math.min(2, Math.floor(entry.hsl.s * 3));
  const lightnessBucket = Math.min(4, Math.floor(entry.hsl.l * 5));

  return `h${hueBucket}-s${saturationBucket}-l${lightnessBucket}`;
}

function luminanceFromRgb([red, green, blue]: [number, number, number]) {
  return (red * 299 + green * 587 + blue * 114) / 1000;
}
