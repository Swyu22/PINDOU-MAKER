# Pindou Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first local web app that converts imported images into editable Mard 221 bead patterns and exports a single high-resolution PNG sheet.

**Architecture:** Use a Vite + React + TypeScript frontend with browser-only image processing. Keep the app split into palette, pattern, export, and page-shell modules so the color system, quantization logic, smoothing, and sheet rendering stay testable outside the UI.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, Testing Library, Canvas API

---

### Task 1: Establish the frontend and test baseline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/vite-env.d.ts`
- Create: `src/test/setup.ts`

**Step 1: Write the failing tests**

Create the initial test suite for palette, generator, history, export model, and the shell app.

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL because the implementation files do not exist yet.

**Step 3: Install runtime and test dependencies**

Run: `npm install`
Expected: dependencies resolve and the test runner becomes available.

### Task 2: Implement the pure bead-pattern modules

**Files:**
- Create: `src/modules/palette/mard221.ts`
- Create: `src/modules/pattern/generator.ts`
- Create: `src/modules/pattern/history.ts`
- Create: `src/modules/export/sheet.ts`

**Step 1: Make the palette tests pass**

Add the normalized Mard 221 palette and guarantee the array length is exactly 221.

**Step 2: Make the generator tests pass**

Implement palette mapping, max-color limiting, and smoothing for isolated noise.

**Step 3: Make the history and sheet-model tests pass**

Implement undo/redo state helpers and the export-sheet model builder.

**Step 4: Re-run tests**

Run: `npm test`
Expected: module-level tests pass before UI work starts.

### Task 3: Build the UI shell, editor, and export flow

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Modify: `src/README.md`
- Modify: `.cloud.md`
- Modify: `docs/20-plan/current-iteration.md`
- Modify: `ai/sessions/2026-04-04.md`

**Step 1: Make the app-shell test pass**

Build the upload, control, grid, legend, edit, and export sections so the App test can render the workflow.

**Step 2: Add browser-only image import and PNG export**

Wire the Canvas API to process imported images locally and render the final sheet.

**Step 3: Run verification**

Run: `npm test`
Run: `npm run build`
Expected: tests and production build both pass.

**Step 4: Sync project state**

Update status docs, file inventories, and session notes with the implementation outcome and next actions.
