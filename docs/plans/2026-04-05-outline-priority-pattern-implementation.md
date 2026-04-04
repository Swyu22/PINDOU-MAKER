# Outline-Priority Pattern Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve object readability by protecting bright and dark contour anchors during bead chart generation.

**Architecture:** Extend the pattern generator so each target cell evaluates both a dominant base color and one or more high-contrast accent candidates. Final color selection will combine regional color fidelity with outline strength, highlight protection, and neighborhood support.

**Tech Stack:** Vite, React, TypeScript, Vitest, browser Canvas/ImageData pipeline

---

### Task 1: Add failing outline-preservation regressions

**Files:**
- Modify: `src/modules/pattern/generator.test.ts`

**Step 1: Write the failing tests**
- Add a synthetic `dark eye + white catchlight` raster and assert the generated pattern keeps at least one bright eye highlight cell.
- Add a `subject edge against lighter background` raster and assert the boundary keeps at least two luminance bands instead of collapsing.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL on the new contour/highlight assertions.

**Step 3: Commit**

```bash
git add src/modules/pattern/generator.test.ts
git commit -m "test: add outline preservation regressions"
```

### Task 2: Add outline-aware cell analysis

**Files:**
- Modify: `src/modules/pattern/generator.ts`

**Step 1: Implement per-cell analysis**
- Add a helper that inspects each cell region and computes:
  - dominant/base RGB
  - bright accent RGB
  - dark accent RGB
  - mean luminance
  - luminance variance
  - edge strength
- Keep this as pure data so the selection policy can be tested.

**Step 2: Run target test**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL shifts from missing analysis to final-selection behavior if analysis compiles correctly.

**Step 3: Commit**

```bash
git add src/modules/pattern/generator.ts
git commit -m "feat: analyze per-cell contour anchors"
```

### Task 3: Select final cell colors with outline priority

**Files:**
- Modify: `src/modules/pattern/generator.ts`
- Modify: `src/modules/pattern/generator.test.ts`

**Step 1: Implement final candidate selection**
- Compare base and accent candidates after palette matching.
- Keep accent candidates only when they pass:
  - strong contrast
  - minimum coverage
  - edge or neighborhood support
- Protect both bright and dark anchors during smoothing.

**Step 2: Run target tests**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for catchlight, edge, and warm-tone regressions.

**Step 3: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "feat: prioritize outline anchors in pattern selection"
```

### Task 4: Keep UI and responsive preview aligned

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/modules/pattern/preview.ts`
- Modify: `src/modules/pattern/preview.test.ts`

**Step 1: Verify 48x48 and preview behavior still make sense**
- Keep 48x48 in the size selector.
- Ensure preview code-visibility logic still degrades gracefully for dense grids after generator changes.

**Step 2: Run focused UI tests**

Run: `npm test -- src/modules/pattern/preview.test.ts src/App.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/modules/pattern/preview.ts src/modules/pattern/preview.test.ts
git commit -m "test: keep 48x48 preview coverage aligned"
```

### Task 5: Final verification and state sync

**Files:**
- Modify: `.cloud.md`
- Modify: `docs/20-plan/current-iteration.md`
- Modify: `ai/sessions/2026-04-05.md`
- Modify: `docs/README.md`

**Step 1: Run full verification**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS

**Step 2: Sync docs**
- Record the outline-priority generator update in the required state files.
- Add both new plan documents to `docs/README.md`.

**Step 3: Commit**

```bash
git add .cloud.md docs/20-plan/current-iteration.md ai/sessions/2026-04-05.md docs/README.md docs/plans/2026-04-05-outline-priority-pattern-design.md docs/plans/2026-04-05-outline-priority-pattern-implementation.md
git commit -m "docs: record outline-priority generator plan"
```
