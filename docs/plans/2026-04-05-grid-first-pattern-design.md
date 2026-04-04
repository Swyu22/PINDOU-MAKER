# Grid-First Pattern Rewrite Design

**Date:** 2026-04-05

## Goal
- Replace the current whole-image smoothing-first conversion path with a grid-first conversion path that samples each target bead cell from its corresponding image region.
- Make the preview grid fit mobile screens by default instead of overflowing the viewport.
- Prepare the project for first-time migration into `Swyu22/PINDOU-MAKER` and GitHub Pages preview.

## Problem
- The current generator smooths and limits colors too early, so the image collapses into coarse light/dark contrast and loses the original subject.
- Small but important features can survive better than before, but the main conversion path still does not reflect how a bead chart should be produced.
- The mobile preview uses mostly fixed display sizing, so larger grids can overflow and show only part of the chart.

## Chosen Approach
- Use a grid-first pipeline:
  1. Rasterize the source image into a higher-resolution sampling raster.
  2. Derive the output chart size from the configured target size.
  3. Split the raster into `width x height` grid regions.
  4. Compute one representative color per region using area-weighted average color.
  5. Map each representative color to the nearest `Mard 221` color.
  6. Apply only light post-processing for isolated noise and optional color-count reduction.
- Use responsive preview sizing:
  1. Measure the preview frame width.
  2. Derive display cell size from available width and column count.
  3. Clamp cell size to a usable range.
  4. Prefer full-grid fit on mobile, keeping overflow only as a fallback.

## Why This Approach
- It matches the real bead-chart mental model: one bead cell represents one image region.
- It preserves midtones and local color variation better than whole-image smoothing.
- It improves similarity without requiring a much more complex edge-reconstruction system.
- It keeps the code testable with pure helper functions.

## Algorithm Details
- `rasterizeImageToRawData()` will rasterize to a sampling raster whose longest side is `targetSize * sampleScale`, not directly to the final grid size.
- `generatePattern()` will:
  - compute output grid dimensions with `fitWithinTarget()`
  - sample each region from the raster
  - compute one weighted-average RGB color per region
  - map that RGB to nearest `Mard 221`
  - optionally reduce color count afterward
  - lightly smooth isolated single-cell noise without flattening the whole image

## Preview Details
- Add a pure helper for responsive preview sizing so the logic is unit-testable.
- The React app will measure the preview frame and pass a CSS custom property for cell size.
- On narrow screens, the whole chart should fit width-first.
- In `code` preview mode, cell labels may be suppressed when cells become too small to remain legible.

## Testing
- Add failing tests proving:
  - region sampling preserves multiple midtone families instead of collapsing to extreme contrast
  - a multi-pixel region maps by average color rather than by one arbitrary pixel
  - responsive preview sizing fits a 32-column chart into a narrow mobile-width container
- Keep build and existing editor/export tests green.

## Migration
- Initialize git in the local workspace.
- Add `origin` pointing to `https://github.com/Swyu22/PINDOU-MAKER.git`.
- Commit the migrated project and push to `main`.
- Reuse the existing GitHub Pages workflow already in the repo contents.
