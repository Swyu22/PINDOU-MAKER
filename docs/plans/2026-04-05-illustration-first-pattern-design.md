# Illustration-First Pattern Design

## Problem
- The current generator still treats stylized artwork like a general-purpose photo-to-pixel conversion problem.
- On illustration-heavy inputs, it preserves too many anti-aliasing colors, JPEG artifacts, and edge tints before the subject structure is stabilized.
- The result keeps many legal Mard colors but loses readable form, so outputs degrade into color piles instead of recognizable dogs, cats, or avatars.

## Input Assumption
- The dominant user input is stylized artwork, stickers, avatars, emoji-like faces, and already-simplified illustrations.
- Real photos still matter, but they are not the main optimization target for this rework.
- V1 should therefore default to an illustration-first generation path instead of a photo-first path.

## Design Goal
- Make first-pass outputs look structurally recognizable before chasing maximum palette usage.
- Prioritize:
  - subject readability
  - stable color masses
  - sparse thin contours
  - tiny protected anchors such as eye highlights
- De-prioritize:
  - preserving every source transition
  - using the full 221-color palette in the first draft

## Chosen Approach
- Replace the current grid-sample-first styling with an illustration-first layered pipeline:
  1. subject purification
  2. mass simplification
  3. thin contour overlay
  4. micro-anchor preservation
  5. final Mard 221 mapping and cleanup

This keeps the bead chart readable by forcing structure to emerge before high-frequency color detail is allowed back in.

## Layer 1: Subject Purification
- Detect likely background-connected regions at the outer image boundary.
- Treat large contiguous, low-information boundary regions as background candidates instead of mixing them into the subject.
- Merge tiny anti-aliasing and compression colors back into nearby subject masses when they do not form meaningful structure.
- Record high-value structure candidates without drawing them yet:
  - external contour candidates
  - dark facial features
  - bright micro-highlights

The output of this layer should be a cleaner subject mask plus a simplified sampling raster, not a final palette chart.

## Layer 2: Mass Simplification
- Build stable local color masses before contour logic runs.
- Prefer same-family hue/lightness ramps over isolated per-cell variation.
- Organize tone simplification by color family instead of global frequency only.
- Treat color budget as a structure budget:
  - first preserve the minimum number of masses required to make the subject recognizable
  - then allow more palette steps to enrich those masses

This means higher color budgets should add believable tone ramps, not random noise.

## Layer 3: Thin Contours
- Contours are secondary structure helpers, not the primary rendering driver.
- Only add dark contour cells when the edge is:
  - a strong subject/background split
  - a high-value interior structural seam
  - spatially coherent across nearby cells
- Restrict contour width to one cell wherever possible.
- Do not convert ordinary shading transitions into dark outlines.

This avoids the heavy auto-traced look that the previous contour-priority versions produced.

## Layer 4: Micro Anchors
- Preserve very small, high-value details as local overrides:
  - eye catchlights
  - nostril or mouth points
  - tiny dark facial accents
- Micro anchors are allowed only as points or very short runs.
- They must never expand into thick contour rings or large dark blobs.

This is the layer that protects a dog's white eye reflection without turning the whole eye area into black contouring.

## Color Budget Strategy
- `Mard 221` remains the only valid output palette.
- `221` should remain the upper limit, but not the default first-pass target for stylized inputs.
- The first draft should default to a moderate color budget, then scale upward only by adding stable tone layers within existing masses.
- For stylized mode, more colors should mean richer masses, not more fragmentation.

## Testing Strategy
- Add regression tests that encode the style contract:
  - stylized dog-face structure remains readable
  - thin contours stay sparse and mostly external
  - bright eye highlights survive without outline bleed
  - moderate color budgets preserve structure better than the old full-budget-first approach
- Validate with the user-provided dog image through local preview artifacts in addition to unit tests.

## Scope
- In scope:
  - generator rework for stylized-image defaults
  - color-budget retuning for first-pass output
  - contour and anchor logic rewrite
  - targeted regressions and image-based verification
- Out of scope:
  - AI segmentation
  - server-side image processing
  - non-Mard palettes
  - a separate full photo mode in this rework
