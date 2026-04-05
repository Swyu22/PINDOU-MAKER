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

type AccentCandidate = {
  profile: SourceColorProfile;
  coverage: number;
  contrast: number;
};

type CellAnalysis = {
  base: SourceColorProfile;
  brightAccent: AccentCandidate | null;
  darkAccent: AccentCandidate | null;
  variance: number;
  contrastRange: number;
};

type LayerSelectionResult = {
  cells: PaletteEntryWithLab[];
  protectedIndices: number[];
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
  const analyses = sampleImageToGridAnalyses(image, gridSize.width, gridSize.height);
  const representativeProfiles = analyses.map((analysis) => analysis.base);
  const sourceFamilyStats = buildSourceFamilyStats(representativeProfiles);
  const massCells = buildMassCells(analyses, sourceFamilyStats);
  const contouredCells = applyThinContours(analyses, massCells, gridSize.width, gridSize.height);
  const anchoredCells = applyMicroAnchors(analyses, contouredCells.cells, massCells, gridSize.width, gridSize.height);
  const selectedCells = {
    cells: anchoredCells.cells,
    protectedIndices: [...new Set([...contouredCells.protectedIndices, ...anchoredCells.protectedIndices])],
  };
  const protectedCodesFromAnchors = new Set(selectedCells.protectedIndices.map((index) => selectedCells.cells[index].code));
  const { cells: limitedCells, protectedIndices } = limitColors(
    selectedCells.cells,
    Math.min(PALETTE_WITH_LAB.length, Math.max(2, config.maxColors)),
    protectedCodesFromAnchors,
    selectedCells.protectedIndices,
  );
  const smoothedCells = smoothCells(limitedCells, gridSize.width, gridSize.height, config.smoothLevel, protectedIndices);

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
  return sampleImageToGridAnalyses(image, gridWidth, gridHeight).map((analysis) => analysis.base.rgb);
}

function sampleImageToGridAnalyses(image: RawImageDataLike, gridWidth: number, gridHeight: number): CellAnalysis[] {
  const cells: CellAnalysis[] = [];

  for (let row = 0; row < gridHeight; row += 1) {
    const startY = Math.floor((row * image.height) / gridHeight);
    const endY = row === gridHeight - 1 ? image.height : Math.max(startY + 1, Math.floor(((row + 1) * image.height) / gridHeight));

    for (let column = 0; column < gridWidth; column += 1) {
      const startX = Math.floor((column * image.width) / gridWidth);
      const endX =
        column === gridWidth - 1 ? image.width : Math.max(startX + 1, Math.floor(((column + 1) * image.width) / gridWidth));
      const regionSamples: Array<{ rgb: [number, number, number]; luminance: number }> = [];
      let red = 0;
      let green = 0;
      let blue = 0;
      let totalWeight = 0;
      let luminanceSum = 0;
      let luminanceSquaredSum = 0;
      let minLuminance = Number.POSITIVE_INFINITY;
      let maxLuminance = Number.NEGATIVE_INFINITY;

      for (let sampleY = startY; sampleY < endY; sampleY += 1) {
        for (let sampleX = startX; sampleX < endX; sampleX += 1) {
          const sampleIndex = (sampleY * image.width + sampleX) * 4;
          const alpha = image.data[sampleIndex + 3];
          const rgb = normalizeTransparentPixel(
            [image.data[sampleIndex], image.data[sampleIndex + 1], image.data[sampleIndex + 2]],
            alpha,
          );
          const luminance = luminanceFromRgb(rgb);
          const weight = alpha < 16 ? 1 : Math.max(alpha / 255, 0.35);

          regionSamples.push({ rgb, luminance });
          red += srgbChannelToLinear(rgb[0]) * weight;
          green += srgbChannelToLinear(rgb[1]) * weight;
          blue += srgbChannelToLinear(rgb[2]) * weight;
          totalWeight += weight;
          luminanceSum += luminance;
          luminanceSquaredSum += luminance * luminance;
          minLuminance = Math.min(minLuminance, luminance);
          maxLuminance = Math.max(maxLuminance, luminance);
        }
      }

      const baseRgb: [number, number, number] = [
        linearChannelToSrgb(red / Math.max(1, totalWeight)),
        linearChannelToSrgb(green / Math.max(1, totalWeight)),
        linearChannelToSrgb(blue / Math.max(1, totalWeight)),
      ];
      const meanLuminance = luminanceSum / Math.max(1, regionSamples.length);
      const variance = Math.max(0, luminanceSquaredSum / Math.max(1, regionSamples.length) - meanLuminance ** 2);
      const deviation = Math.sqrt(variance);
      const brightThreshold = meanLuminance + Math.max(26, deviation * 0.85);
      const darkThreshold = meanLuminance - Math.max(24, deviation * 0.75);
      const brightAccent = buildAccentCandidate(regionSamples, (sample) => sample.luminance >= brightThreshold, meanLuminance);
      const darkAccent = buildAccentCandidate(regionSamples, (sample) => sample.luminance <= darkThreshold, meanLuminance);

      cells.push({
        base: createSourceColorProfile(baseRgb),
        brightAccent,
        darkAccent,
        variance,
        contrastRange: maxLuminance - minLuminance,
      });
    }
  }

  return cells;
}

function buildAccentCandidate(
  samples: Array<{ rgb: [number, number, number]; luminance: number }>,
  predicate: (sample: { rgb: [number, number, number]; luminance: number }) => boolean,
  meanLuminance: number,
): AccentCandidate | null {
  const matching = samples.filter(predicate);

  if (matching.length === 0) {
    return null;
  }

  let red = 0;
  let green = 0;
  let blue = 0;
  let luminanceSum = 0;

  for (const sample of matching) {
    red += srgbChannelToLinear(sample.rgb[0]);
    green += srgbChannelToLinear(sample.rgb[1]);
    blue += srgbChannelToLinear(sample.rgb[2]);
    luminanceSum += sample.luminance;
  }

  const rgb: [number, number, number] = [
    linearChannelToSrgb(red / matching.length),
    linearChannelToSrgb(green / matching.length),
    linearChannelToSrgb(blue / matching.length),
  ];
  const profile = createSourceColorProfile(rgb);

  return {
    profile,
    coverage: matching.length / Math.max(1, samples.length),
    contrast: Math.abs(luminanceSum / matching.length - meanLuminance),
  };
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

function buildMassCells(analyses: CellAnalysis[], sourceFamilyStats: Map<string, SourceFamilyStats>) {
  return analyses.map((analysis) => findNearestPalette(analysis.base, PALETTE_WITH_LAB, sourceFamilyStats));
}

function applyThinContours(
  analyses: CellAnalysis[],
  massCells: PaletteEntryWithLab[],
  width: number,
  height: number,
): LayerSelectionResult {
  const selectedCells = [...massCells];
  const protectedIndices: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const contourEntry = chooseThinContourOverride(analyses[index], massCells, width, height, x, y);

      if (contourEntry === null) {
        continue;
      }

      selectedCells[index] = contourEntry;
      protectedIndices.push(index);
    }
  }

  softenInteriorAdjacentToContours(selectedCells, protectedIndices, massCells, width, height);
  collapseInteriorDarkComponentCells(selectedCells, massCells, width, height);

  return {
    cells: selectedCells,
    protectedIndices,
  };
}

function applyMicroAnchors(
  analyses: CellAnalysis[],
  layeredCells: PaletteEntryWithLab[],
  massCells: PaletteEntryWithLab[],
  width: number,
  height: number,
): LayerSelectionResult {
  const selectedCells = [...layeredCells];
  const protectedIndices = new Set<number>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const analysis = analyses[index];
      const neighborLuminances = collectNeighborLuminances(selectedCells, width, height, x, y);
      const neighborRange =
        neighborLuminances.length === 0
          ? 0
          : Math.max(...neighborLuminances) - Math.min(...neighborLuminances);
      const brightEntry = chooseBrightMicroAnchor(analysis, massCells[index], neighborRange);

      if (brightEntry !== null) {
        selectedCells[index] = brightEntry;
        protectedIndices.add(index);
        continue;
      }

      const darkEntry = chooseDarkMicroAnchor(analysis, massCells[index], neighborRange);

      if (darkEntry !== null) {
        selectedCells[index] = darkEntry;
        protectedIndices.add(index);
      }
    }
  }

  return {
    cells: selectedCells,
    protectedIndices: [...protectedIndices],
  };
}

function collectNeighborLuminances(cells: PaletteEntryWithLab[], width: number, height: number, x: number, y: number) {
  const luminances: number[] = [];

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

      luminances.push(cells[neighborY * width + neighborX].luminance);
    }
  }

  return luminances;
}

function chooseThinContourOverride(
  analysis: CellAnalysis,
  massCells: PaletteEntryWithLab[],
  width: number,
  height: number,
  x: number,
  y: number,
) {
  const index = y * width + x;
  const massEntry = massCells[index];
  const contourSource =
    analysis.darkAccent !== null && analysis.darkAccent.coverage >= 0.08 && analysis.darkAccent.contrast >= 24
      ? analysis.darkAccent.profile
      : analysis.base.luminance <= 96
      ? analysis.base
        : null;

  if (contourSource === null) {
    return null;
  }

  const brightBoundary = hasExteriorBrightNeighbor(massCells, width, height, x, y, contourSource.luminance);

  if (!brightBoundary) {
    return null;
  }

  const neighborLuminances = collectNeighborLuminances(massCells, width, height, x, y);
  const neighborRange =
    neighborLuminances.length === 0 ? 0 : Math.max(...neighborLuminances) - Math.min(...neighborLuminances);

  if (analysis.contrastRange < 42 && neighborRange < 52) {
    return null;
  }

  if (massEntry.luminance - contourSource.luminance < 18 && analysis.base.luminance > 110) {
    return null;
  }

  return findContourPalette(contourSource, massEntry);
}

function softenInteriorAdjacentToContours(
  cells: PaletteEntryWithLab[],
  contourIndices: number[],
  massCells: PaletteEntryWithLab[],
  width: number,
  height: number,
) {
  const contourSet = new Set(contourIndices);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;

      if (contourSet.has(index) || cells[index].luminance > 95) {
        continue;
      }

      const hasOwnExteriorBright = hasExteriorBrightNeighbor(massCells, width, height, x, y, cells[index].luminance);

      if (hasOwnExteriorBright) {
        continue;
      }

      const adjacentExteriorDarkNeighbor = getCardinalNeighborIndices(width, height, x, y).some((neighborIndex) => {
        const neighborX = neighborIndex % width;
        const neighborY = Math.floor(neighborIndex / width);
        const neighbor = cells[neighborIndex];

        return (
          neighbor.luminance <= cells[index].luminance + 15 &&
          (contourSet.has(neighborIndex) || hasExteriorBrightNeighbor(massCells, width, height, neighborX, neighborY, neighbor.luminance))
        );
      });

      if (!adjacentExteriorDarkNeighbor) {
        continue;
      }

      const brighterInteriorNeighbor = getCardinalNeighborIndices(width, height, x, y)
        .map((neighborIndex) => ({ index: neighborIndex, entry: massCells[neighborIndex] }))
        .filter(({ entry }) => entry.luminance - cells[index].luminance >= 55)
        .filter(({ index, entry }) => !isBorderConnectedBrightRegion(massCells, width, height, index, cells[index].luminance + 55))
        .sort((left, right) => right.entry.luminance - left.entry.luminance)[0];

      if (brighterInteriorNeighbor === undefined) {
        continue;
      }

      cells[index] = brighterInteriorNeighbor.entry;
    }
  }
}

function collapseInteriorDarkComponentCells(
  cells: PaletteEntryWithLab[],
  massCells: PaletteEntryWithLab[],
  width: number,
  height: number,
) {
  const visited = new Set<number>();

  for (let index = 0; index < cells.length; index += 1) {
    if (visited.has(index) || cells[index].luminance > 90) {
      continue;
    }

    const component: number[] = [];
    const queue = [index];

    while (queue.length > 0) {
      const currentIndex = queue.shift();

      if (currentIndex === undefined || visited.has(currentIndex) || cells[currentIndex].luminance > 90) {
        continue;
      }

      visited.add(currentIndex);
      component.push(currentIndex);

      const x = currentIndex % width;
      const y = Math.floor(currentIndex / width);
      queue.push(...getCardinalNeighborIndices(width, height, x, y));
    }

    if (component.length <= 1) {
      continue;
    }

    const componentMinDistance = Math.min(
      ...component.map((currentIndex) => {
        const x = currentIndex % width;
        const y = Math.floor(currentIndex / width);

        return distanceToImageBorder(width, height, x, y);
      }),
    );

    for (const currentIndex of component) {
      const x = currentIndex % width;
      const y = Math.floor(currentIndex / width);

      if (distanceToImageBorder(width, height, x, y) <= componentMinDistance) {
        continue;
      }

      const brighterInteriorNeighbor = getCardinalNeighborIndices(width, height, x, y)
        .map((neighborIndex) => ({ index: neighborIndex, entry: massCells[neighborIndex] }))
        .filter(({ entry }) => entry.luminance - cells[currentIndex].luminance >= 55)
        .sort((left, right) => right.entry.luminance - left.entry.luminance)[0];

      if (brighterInteriorNeighbor !== undefined) {
        cells[currentIndex] = brighterInteriorNeighbor.entry;
      }
    }
  }
}

function chooseBrightMicroAnchor(
  analysis: CellAnalysis,
  massEntry: PaletteEntryWithLab,
  neighborRange: number,
) {
  if (analysis.brightAccent === null) {
    return null;
  }

  const accent = analysis.brightAccent;
  const brightEntry = findAnchorPalette(accent.profile, 'bright');
  const luminanceLift = brightEntry.luminance - massEntry.luminance;

  if (
    accent.coverage >= 0.06 &&
    accent.coverage <= 0.24 &&
    accent.contrast >= 44 &&
    luminanceLift >= 62 &&
    (analysis.contrastRange >= 90 || analysis.variance >= 900) &&
    (neighborRange >= 36 || massEntry.luminance <= 90)
  ) {
    return brightEntry;
  }

  return null;
}

function chooseDarkMicroAnchor(
  analysis: CellAnalysis,
  massEntry: PaletteEntryWithLab,
  neighborRange: number,
) {
  if (analysis.darkAccent === null) {
    return null;
  }

  const accent = analysis.darkAccent;
  const darkEntry = findAnchorPalette(accent.profile, 'dark');
  const luminanceDrop = massEntry.luminance - darkEntry.luminance;

  if (
    accent.coverage >= 0.05 &&
    accent.coverage <= 0.22 &&
    accent.contrast >= 48 &&
    luminanceDrop >= 54 &&
    massEntry.luminance >= 110 &&
    (analysis.contrastRange >= 88 || analysis.variance >= 840) &&
    neighborRange >= 32
  ) {
    return darkEntry;
  }

  return null;
}

function hasExteriorBrightNeighbor(
  cells: PaletteEntryWithLab[],
  width: number,
  height: number,
  x: number,
  y: number,
  sourceLuminance: number,
) {
  const threshold = sourceLuminance + 40;
  const neighborIndices = getCardinalNeighborIndices(width, height, x, y);

  for (const neighborIndex of neighborIndices) {

    if (cells[neighborIndex].luminance < threshold) {
      continue;
    }

    if (isBorderConnectedBrightRegion(cells, width, height, neighborIndex, threshold)) {
      return true;
    }
  }

  return false;
}

function getCardinalNeighborIndices(width: number, height: number, x: number, y: number) {
  const indices: number[] = [];

  if (x > 0) {
    indices.push(y * width + (x - 1));
  }

  if (x < width - 1) {
    indices.push(y * width + (x + 1));
  }

  if (y > 0) {
    indices.push((y - 1) * width + x);
  }

  if (y < height - 1) {
    indices.push((y + 1) * width + x);
  }

  return indices;
}

function distanceToImageBorder(width: number, height: number, x: number, y: number) {
  return Math.min(x, y, width - 1 - x, height - 1 - y);
}

function isBorderConnectedBrightRegion(
  cells: PaletteEntryWithLab[],
  width: number,
  height: number,
  startIndex: number,
  threshold: number,
) {
  const visited = new Set<number>();
  const queue = [startIndex];

  while (queue.length > 0) {
    const index = queue.shift();

    if (index === undefined || visited.has(index)) {
      continue;
    }

    visited.add(index);

    if (cells[index].luminance < threshold) {
      continue;
    }

    const x = index % width;
    const y = Math.floor(index / width);

    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
      return true;
    }

    queue.push(index - 1, index + 1, index - width, index + width);
  }

  return false;
}

function findContourPalette(profile: SourceColorProfile, massEntry: PaletteEntryWithLab) {
  const maximumContourLuminance = Math.max(24, massEntry.luminance - 18);
  const darkCandidates = narrowPaletteByHue(massEntry.hsl, PALETTE_WITH_LAB).filter(
    (entry) => entry.luminance <= maximumContourLuminance,
  );
  const fallbackPalette = PALETTE_WITH_LAB.filter((entry) => entry.luminance <= maximumContourLuminance);
  const palette = darkCandidates.length >= 2 ? darkCandidates : fallbackPalette.length > 0 ? fallbackPalette : [findAnchorPalette(profile, 'dark')];
  const targetLuminance = Math.max(24, Math.min(profile.luminance + 10, massEntry.luminance - 28));
  let best = palette[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const entry of palette) {
    const luminanceDistance = Math.abs(entry.luminance - targetLuminance);
    const hueDistance = circularHueDistance(massEntry.hsl.h, entry.hsl.h) / 180;
    const saturationDistance = Math.abs(massEntry.hsl.s - entry.hsl.s);
    const labDistance = deltaLab(profile.lab, entry.lab);
    const score = luminanceDistance * 1.5 + hueDistance * 16 + saturationDistance * 18 + labDistance * 0.32;

    if (score < bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return best;
}

function findAnchorPalette(profile: SourceColorProfile, mode: 'bright' | 'dark') {
  const constrainedPalette =
    mode === 'bright'
      ? PALETTE_WITH_LAB.filter((entry) => entry.luminance >= Math.max(175, profile.luminance - 25))
      : PALETTE_WITH_LAB.filter((entry) => entry.luminance <= Math.min(90, profile.luminance + 35));
  const palette = constrainedPalette.length >= 3 ? constrainedPalette : PALETTE_WITH_LAB;
  let best = palette[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const entry of palette) {
    const luminanceDistance = Math.abs(profile.luminance - entry.luminance);
    const labDistance = deltaLab(profile.lab, entry.lab);
    const hueDistance = circularHueDistance(profile.hsl.h, entry.hsl.h) / 180;
    const score =
      mode === 'bright'
        ? luminanceDistance * 1.2 + labDistance * 0.45 + hueDistance * 6
        : luminanceDistance * 1.35 + labDistance * 0.38 + hueDistance * 3;

    if (score < bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return best;
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

function limitColors(
  cells: PaletteEntryWithLab[],
  maxColors: number,
  forcedProtectedCodes: Set<string>,
  protectedIndices: number[],
) {
  const counts = new Map<string, number>();

  for (const cell of cells) {
    counts.set(cell.code, (counts.get(cell.code) ?? 0) + 1);
  }

  if (counts.size <= maxColors) {
    const protectedCodes = new Set([...identifyProtectedAccentCodes(cells, counts), ...forcedProtectedCodes]);

    return {
      cells,
      protectedIndices: new Set(protectedIndices),
    };
  }

  const protectedCodes = new Set([...identifyProtectedAccentCodes(cells, counts), ...forcedProtectedCodes]);
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
  const retainedProtectedIndices = new Set(
    protectedIndices.filter((index) => retainedProtectedCodes.has(cells[index]?.code ?? '')),
  );

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
    protectedIndices: retainedProtectedIndices,
  };
}

function smoothCells(cells: PaletteEntryWithLab[], width: number, height: number, smoothLevel: number, protectedIndices: Set<number>) {
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

        if (protectedIndices.has(index)) {
          continue;
        }

        const currentLuminance = luminanceFromRgb(current[index].rgb);
        const dominantLuminance = luminanceFromRgb(dominant.entry.rgb);
        const isProtectedDarkAccent = currentLuminance <= 75 && dominantLuminance - currentLuminance >= 42 && currentSupport <= 1;

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
