# Mass-First Thin-Outline Pattern Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the bead-pattern generator so it is driven by color masses first, with sparse single-cell outlines and tiny protected anchors, producing charts that resemble polished reference bead art instead of heavy auto-traced edges.

**Architecture:** Replace the current outline-priority selection flow with a three-layer pipeline. First build a mass layer that picks stable per-cell body colors and same-family tonal ramps. Then build a thin-outline layer that only injects dark contour cells for high-confidence silhouette and structural seams. Finally build a tiny-anchor layer for eye highlights and similar micro-details, keeping those anchors local instead of expanding them into thick edges.

**Tech Stack:** Vite, React, TypeScript, Vitest, browser Canvas image sampling, static Mard 221 palette.

---

### Task 1: Capture the target style as executable rules

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Add focused regressions that encode the new visual contract:
- a silhouette case where only the outer subject boundary should darken, while internal warm transitions stay unoutlined
- an eye-highlight case where a white catchlight survives, but only as a point, not as a widened ring
- a warm-fur case where internal orange and cream steps remain layered without black contour creep

Use assertions on:
- number of dark contour cells in an interior band
- single-cell width for the strongest contour strip
- presence of multiple warm midtone codes beside preserved highlights

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because the current outline-priority pipeline produces too many contour cells or over-darkens interior transitions.

**Step 3: Write minimal implementation**

Do not implement yet. Stop after the red state is confirmed so the next tasks are driven by the failures.

**Step 4: Run test to verify it still fails for the intended reason**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL with assertion differences tied to heavy contouring rather than syntax or setup errors.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.test.ts
git commit -m "test: encode mass-first contour regressions"
```

### Task 2: Split cell analysis into mass, contour, and anchor signals

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

If Task 1 did not already require new analysis metadata, add a micro test for a cell-analysis helper that distinguishes:
- mass color
- contour confidence
- anchor confidence

The test should prove that a strong silhouette edge and a tiny eye highlight are not treated as the same signal.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because current analysis only exposes base/bright/dark accent behavior.

**Step 3: Write minimal implementation**

Refactor analysis data so each cell can carry:
- `massProfile`
- `contourCandidate`
- `anchorCandidate`
- local variance / luminance span
- neighborhood similarity or edge confidence inputs needed later

Keep the sampling pass single-source-of-truth; do not fork multiple raster passes unless the tests force it.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for the new analysis-level tests, while broader style regressions may still fail.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "refactor: separate mass contour and anchor analysis"
```

### Task 3: Rebuild the mass layer as the default generator output

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Add or tighten a regression proving that interior subject zones prefer same-family warm and light ramps without auto-darkening. The test should look at a body region that currently gains too many black edge cells.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because current selection still allows contour logic to dominate interior cells.

**Step 3: Write minimal implementation**

Change the main selection flow so:
- every cell starts from the mass layer, not contour logic
- family-tone expansion and palette matching are applied to the mass profile first
- contour and anchor stages are optional overlays, not the default cell chooser

In practice, replace the current outline-first chooser with something closer to:
- `buildMassCells(...)`
- `applyThinContours(...)`
- `applyProtectedAnchors(...)`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for the interior mass-layer regressions, with any remaining failures isolated to contour sparsity or anchor control.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "feat: make mass colors the primary selection layer"
```

### Task 4: Replace heavy contour preservation with sparse thin-outline rules

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Add a contour-width regression that proves:
- silhouette edges can be dark
- contour width stays near one cell
- interior shading transitions do not become contour bands

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because the current contour override spreads too aggressively.

**Step 3: Write minimal implementation**

Implement a thin-outline stage with strict gates:
- only apply to strong subject/background boundaries or high-structure seams
- prefer a single-cell dark edge
- suppress contour placement when neighboring cells are within the same hue family and differ mainly by shading
- avoid stacking adjacent contour overrides into thick bands

This should be a contour filter, not a broad edge detector.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for silhouette and contour-width tests.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "feat: enforce sparse single-cell contour rules"
```

### Task 5: Reintroduce micro anchors without outline expansion

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Use the eye-highlight regression to assert both:
- the white highlight remains
- surrounding dark cells do not expand compared with the mass-layer baseline

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because current anchors are too tightly coupled to contour overrides.

**Step 3: Write minimal implementation**

Separate anchor logic from contour logic:
- allow tiny bright or dark anchors only for small, high-contrast, high-confidence points
- cap anchor spread to the local cell or a very short cluster
- exclude anchor cells from contour thickening and from aggressive smoothing

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for highlight preservation without broad surrounding darkening.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "feat: preserve micro anchors without contour bleed"
```

### Task 6: Retune color limiting and smoothing around the new layered model

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Add a regression for a moderate `maxColors` setting to prove that:
- mass-layer warm steps survive
- thin contours remain sparse
- smoothing removes isolated dirt but does not erase anchors

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because current limit/smooth logic was tuned for outline-priority behavior.

**Step 3: Write minimal implementation**

Adjust:
- protected cell sets so mass, contour, and anchor cells are treated differently
- color limiting so it preserves tonal ramps before extra contour codes
- smoothing so it cleans isolated artifacts but never widens or duplicates contour cells

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for color-budget and smoothing regressions.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "fix: align color limiting and smoothing with layered rendering"
```

### Task 7: Run full verification and update state docs

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\.cloud.md`
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\docs\20-plan\current-iteration.md`
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\ai\sessions\2026-04-05.md`
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\docs\README.md`

**Step 1: Run targeted generator tests**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS

**Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS

**Step 4: Update status files**

Record:
- the shift from outline-priority to mass-first thin-outline generation
- what changed in contour and anchor logic
- exact verification results

**Step 5: Commit**

```bash
git add .cloud.md docs/20-plan/current-iteration.md ai/sessions/2026-04-05.md docs/README.md docs/plans/2026-04-05-mass-first-thin-outline-pattern-implementation.md
git commit -m "docs: record mass-first thin-outline generator plan"
```
