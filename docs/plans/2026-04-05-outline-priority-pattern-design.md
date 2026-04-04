# Outline-Priority Pattern Design

## Problem
- The current generator preserves more color variety than before, but it still loses shape-defining anchors.
- Small but critical highlights and edges, such as a dog's eye catchlight or a dark mouth line against lighter fur, get averaged away inside a cell.
- This makes the result color-rich but structurally weak: users see a color mosaic instead of a readable object.

## Root Cause
- The core pipeline still treats each bead cell as a single average-color problem.
- Once a highlight or edge is merged into the cell average, later palette matching cannot recover it.
- The current smoothing protection mainly preserves dark anchors, but does not explicitly preserve bright anchors, edge anchors, or outline transitions.

## Chosen Approach
- Switch from `single representative color per cell` to `outline-priority dual candidate analysis`.
- Each cell will compute:
  - `base candidate`: the dominant color for the cell area.
  - `accent candidate`: a small-area high-contrast candidate extracted from the same region.
- A separate outline/anchor score will decide whether the final cell should keep the base color or preserve the accent color.

## Detection Rules
- Build a high-resolution luminance map from the sampling raster.
- For each target cell, extract:
  - mean luminance
  - luminance variance
  - brightest cluster candidate
  - darkest cluster candidate
  - local edge strength based on luminance gradients
- Preserve an accent only if it passes strict rules:
  - strong luminance contrast versus the base candidate
  - non-trivial coverage inside the cell
  - either sits on a strong edge or is supported by nearby cells with similar contrast behavior

## Outline Priority Strategy
- Bright anchors:
  - protect tiny white or light reflections inside dark shapes when contrast is high enough
- Dark anchors:
  - preserve dark pupils, nostrils, mouth lines, and deep boundary cuts
- Boundary cells:
  - prefer candidates that maximize readable separation from neighboring cells when the region lies on a strong contour

## Expected Result
- Eye highlights remain visible instead of collapsing into all-black eyes.
- Boundary transitions between subject and background become clearer.
- The output may sacrifice a small amount of smooth color continuity in exchange for stronger object readability, which is the intended tradeoff.

## Scope
- In scope:
  - generator sampling logic
  - anchor/outline preservation heuristics
  - regression tests for eye highlights and outline anchors
  - 48x48 must keep working with the new logic
- Out of scope:
  - semantic segmentation
  - AI subject detection
  - server-side processing
