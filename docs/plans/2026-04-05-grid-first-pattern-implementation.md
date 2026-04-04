# Grid-First Pattern Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the pattern generator to sample each output cell from its image region, make the preview fit mobile screens by default, and migrate the workspace into `Swyu22/PINDOU-MAKER`.

**Architecture:** Keep the app browser-only and preserve the palette, pattern, export, and UI shell module boundaries. Move the generator from a smoothing-first pipeline to a grid-first sampling pipeline, and move preview sizing into a pure helper so responsive behavior stays testable.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, Testing Library, Canvas API, Git, GitHub Pages

---

### Task 1: Document the approved redesign

**Files:**
- Create: `docs/plans/2026-04-05-grid-first-pattern-design.md`
- Create: `docs/plans/2026-04-05-grid-first-pattern-implementation.md`
- Modify: `docs/README.md`

**Step 1: Save the approved design**
- Write the design document covering grid-first sampling, weighted-average color selection, mobile preview fitting, and repo migration.

**Step 2: Save the execution plan**
- Write this implementation plan with TDD checkpoints and exact file targets.

**Step 3: Register the docs**
- Add both new plan files to `docs/README.md`.

### Task 2: Add failing generator tests for grid-first sampling

**Files:**
- Modify: `src/modules/pattern/generator.test.ts`

**Step 1: Write a failing test for region-average mapping**
- Add a test proving one output cell is derived from the average color of its whole region, not one source pixel.

**Step 2: Write a failing test for midtone preservation**
- Add a test proving a face-like sample retains multiple non-extreme palette families after conversion.

**Step 3: Run the focused test file**
- Run: `npm test -- src/modules/pattern/generator.test.ts`
- Expected: FAIL with assertions showing the current generator still over-compresses the image.

### Task 3: Add failing responsive preview tests

**Files:**
- Create: `src/modules/pattern/preview.ts`
- Create: `src/modules/pattern/preview.test.ts`
- Modify: `src/modules/README.md`
- Modify: `src/README.md`

**Step 1: Write preview sizing tests**
- Add tests for responsive cell-size calculation and small-cell code visibility thresholds.

**Step 2: Run the focused preview tests**
- Run: `npm test -- src/modules/pattern/preview.test.ts`
- Expected: FAIL because the helper does not exist yet.

### Task 4: Implement the grid-first generator rewrite

**Files:**
- Modify: `src/modules/pattern/generator.ts`
- Modify: `src/modules/pattern/types.ts`

**Step 1: Implement sampling-raster sizing**
- Rasterize imported images to a higher-resolution sampling raster instead of final-grid dimensions.

**Step 2: Implement per-region weighted-average sampling**
- Derive output grid dimensions, iterate each target cell region, and compute weighted-average RGB values.

**Step 3: Map sampled colors to nearest Mard 221**
- Keep palette matching pure and deterministic.

**Step 4: Reduce color count only after mapping**
- Keep `maxColors` as a post-process limit rather than a pre-conversion simplifier.

**Step 5: Keep smoothing lightweight**
- Retain only isolated-noise cleanup and avoid full-image flattening.

**Step 6: Run focused generator tests**
- Run: `npm test -- src/modules/pattern/generator.test.ts`
- Expected: PASS.

### Task 5: Implement mobile preview fitting

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.test.tsx`
- Create: `src/modules/pattern/preview.ts`
- Create: `src/modules/pattern/preview.test.ts`

**Step 1: Implement responsive preview helpers**
- Add pure functions for deriving display cell size and label visibility.

**Step 2: Wire preview frame measurement into App**
- Measure preview frame width and pass a computed cell size into the grid via CSS custom properties.

**Step 3: Update styles for width-first fit**
- Make the grid fit the mobile viewport by default and keep overflow as a fallback only.

**Step 4: Run preview and app tests**
- Run: `npm test -- src/modules/pattern/preview.test.ts src/App.test.tsx`
- Expected: PASS.

### Task 6: Verify the whole app and sync state

**Files:**
- Modify: `.cloud.md`
- Modify: `docs/20-plan/current-iteration.md`
- Modify: `ai/sessions/2026-04-05.md`
- Modify: `README.md`
- Modify: `docs/00-context/PROJECT_MAP.md`

**Step 1: Run full verification**
- Run: `npm test`
- Run: `npm run build`
- Expected: all tests pass and the production build succeeds.

**Step 2: Update state files**
- Record the generator rewrite, mobile preview adaptation, and verification results.

### Task 7: Initialize git and migrate to GitHub

**Files:**
- Modify: local repository metadata only

**Step 1: Initialize the local repository**
- Run: `git init -b main`

**Step 2: Add the GitHub remote**
- Run: `git remote add origin https://github.com/Swyu22/PINDOU-MAKER.git`

**Step 3: Create the initial migration commit**
- Run: `git add .`
- Run: `git commit -m "feat: launch grid-first pindou maker"`

**Step 4: Push to GitHub**
- Run: `git push -u origin main`
- Expected: the current project appears in `Swyu22/PINDOU-MAKER`.
