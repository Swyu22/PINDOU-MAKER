# Illustration-First Pattern Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the generator around stylized-image rendering so first-pass bead charts preserve recognizable subject structure before high-detail palette richness.

**Architecture:** Replace the current mass-first thin-outline pipeline with an illustration-first layered flow. First purify likely subject pixels and suppress boundary/background noise. Then build stable color masses, add sparse single-cell contours only for high-confidence structure, preserve micro-anchors such as eye highlights, and finally apply color limiting and cleanup in a way that keeps masses stable.

**Tech Stack:** Vite, React, TypeScript, Vitest, browser Canvas image sampling, static Mard 221 palette.

---

### Task 1: Capture the stylized-image contract in failing tests

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Add focused regressions for stylized artwork:
- a dog-face style case where a light subject on a light background must still keep a readable face shape
- an eye-highlight case where a bright catchlight survives inside a dark eye
- a contour case where the external silhouette can darken, but interior shading does not become heavy contour bands
- a color-budget case where a moderate palette budget preserves structure better than the full-budget noisy baseline

Use assertions on:
- presence of identifiable facial feature codes
- maximum interior dark-band thickness
- number of distinct mass-family steps in the face area
- preservation of a bright anchor point without adjacent contour expansion

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because the current pipeline still over-preserves stylized noise and does not stabilize the subject first.

**Step 3: Write minimal implementation**

Do not implement yet. Stop after red is confirmed.

**Step 4: Run test to verify it still fails for the intended reason**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL with assertion differences tied to stylized-image structure, not setup errors.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.test.ts
git commit -m "test: add stylized illustration generator regressions"
```

### Task 2: Introduce subject purification analysis

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Add a helper-level regression that proves boundary-connected low-information regions are treated as background or low-priority mass input instead of equal subject structure.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because current sampling treats boundary tints and true subject shading similarly.

**Step 3: Write minimal implementation**

Refactor generator analysis so each sampled cell can carry:
- base profile
- background-likelihood or boundary-purity signal
- mass confidence
- contour confidence
- anchor confidence

Keep this inside the generator module; do not spread UI concerns into the sampling pipeline.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for the new subject-purification regression while broader stylized regressions may still fail.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "refactor: add stylized subject purification signals"
```

### Task 3: Rebuild the primary output around mass simplification

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Add or tighten a regression proving that stable face masses survive before contouring:
- white fur remains a few controlled cool/warm layers
- the muzzle, cheek, and tongue are distinct masses
- anti-aliasing colors do not become independent bead regions

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because the current flow still allows over-fragmented per-cell color variation.

**Step 3: Write minimal implementation**

Implement a mass-building stage that:
- downweights likely background-connected noise
- clusters same-family stylized colors into stable masses
- expands color richness only inside those masses
- becomes the default output before contours and anchors are applied

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for the mass-structure regressions.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "feat: make stylized mass simplification the primary generator output"
```

### Task 4: Rebuild contours as a sparse secondary layer

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Add a contour regression showing:
- silhouette edges can stay dark
- contour width stays mostly one cell
- interior face shading does not collapse into dark rings

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because the current contour layer is still tuned to previous assumptions.

**Step 3: Write minimal implementation**

Implement a contour overlay that:
- uses the mass layer as the baseline
- only darkens high-confidence structural edges
- rejects edges caused mostly by soft shading
- prevents adjacent contour promotion from forming thick bands

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for the thin-contour regressions.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "feat: add sparse stylized contour overlay"
```

### Task 5: Preserve micro anchors without contour bleed

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Use the eye-highlight regression to assert:
- the bright point remains inside the eye region
- adjacent dark cells do not expand compared with the mass-layer baseline

**Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: FAIL because the current anchor logic is still coupled to contour behavior.

**Step 3: Write minimal implementation**

Separate anchor selection from contour selection:
- keep bright and dark anchors tiny
- protect them from smoothing
- forbid them from widening nearby contour selections

**Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/pattern/generator.test.ts`
Expected: PASS for the micro-anchor regressions.

**Step 5: Commit**

```bash
git add src/modules/pattern/generator.ts src/modules/pattern/generator.test.ts
git commit -m "feat: preserve stylized micro anchors"
```

### Task 6: Retune defaults and color-budget behavior for stylized mode

**Files:**
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\App.tsx`
- Modify: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.ts`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\App.test.tsx`
- Test: `C:\Users\SwYu1\Documents\BaiduSyncdisk\Web Projects\Pindou\src\modules\pattern\generator.test.ts`

**Step 1: Write the failing test**

Add UI and generator regressions showing:
- stylized mode defaults to a moderate first-pass color budget
- increasing the color budget enriches existing masses instead of exploding fragment count

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx src/modules/pattern/generator.test.ts`
Expected: FAIL because defaults are still tuned toward full-budget richness.

**Step 3: Write minimal implementation**

Update defaults so stylized inputs start with a moderate color budget and low smoothing while still allowing manual increase up to 221.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx src/modules/pattern/generator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx src/modules/pattern/generator.ts src/App.test.tsx src/modules/pattern/generator.test.ts
git commit -m "feat: retune stylized-mode defaults"
```

### Task 7: Verify against the real dog image and update state docs

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

**Step 4: Re-run the local dog-image preview check**

Use the real image at `C:\Users\SwYu1\Desktop\微信图片_20260405110936_25_329.jpg` to generate updated preview artifacts and compare the result qualitatively against the earlier noisy output.

**Step 5: Update status files**

Record:
- the shift to an illustration-first default generation path
- any default budget changes
- fresh verification results from tests, build, and dog-image preview

**Step 6: Commit**

```bash
git add .cloud.md docs/20-plan/current-iteration.md ai/sessions/2026-04-05.md docs/README.md docs/plans/2026-04-05-illustration-first-pattern-design.md docs/plans/2026-04-05-illustration-first-pattern-implementation.md
git commit -m "docs: record illustration-first generator rework"
```
