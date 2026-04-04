# Bootstrap MVS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete `Pindou` bootstrap MVS without assuming a concrete framework or runtime stack.

**Architecture:** Reuse the existing Starter Kit as the state backbone, then replace placeholders with current facts, add module-level README files, and initialize a technology-neutral `src` skeleton. Keep runtime code absent until product scope and stack are confirmed.

**Tech Stack:** Markdown, PowerShell, filesystem-based collaboration workflow

---

### Task 1: Audit Existing Bootstrap Assets

**Files:**
- Modify: `.cloud.md`
- Modify: `docs/00-context/PROJECT_MAP.md`
- Modify: `docs/20-plan/current-iteration.md`
- Test: root filesystem existence checks

**Step 1: Capture current state**

Run: `Get-ChildItem -Force`
Expected: Starter Kit files exist and `src/` is empty or nearly empty.

**Step 2: Verify required bootstrap files**

Run: `Test-Path 'CLAUDE.md'; Test-Path '.cloud.md'; Test-Path 'docs/00-context/PROJECT_MAP.md'`
Expected: existing files return `True`; missing items are explicitly listed.

**Step 3: Fill placeholders with project facts**

Update the three state files so they describe the actual bootstrap status, current scope, and next decisions instead of template placeholders.

**Step 4: Re-run existence checks**

Run: `Get-ChildItem -Force docs,ai,src`
Expected: directories and updated files are visible.

### Task 2: Add Minimal Module Documentation

**Files:**
- Modify: `README.md`
- Create: `docs/README.md`
- Create: `ai/README.md`
- Create: `src/README.md`

**Step 1: Turn root README into project overview**

Document current status, top-level structure, current gaps, and next steps.

**Step 2: Add module READMEs**

Create concise READMEs for `docs/`, `ai/`, and `src/` that define responsibilities, boundaries, and file inventory.

**Step 3: Confirm file inventory is registered**

Check that every newly created file is listed in the relevant module README or root README.

### Task 3: Create Session Log And Neutral Source Skeleton

**Files:**
- Create: `ai/sessions/2026-04-04.md`
- Create: `docs/plans/2026-04-04-bootstrap-mvs.md`
- Create: `src/modules/`
- Create: `src/shared/`
- Create: `src/assets/`

**Step 1: Write the daily session log**

Use the session template to capture start snapshot, completed work, next actions, and key decisions.

**Step 2: Initialize neutral source directories**

Create only stack-agnostic directories under `src/`; do not add framework-specific entry files.

**Step 3: Verify output**

Run: `Get-ChildItem -Recurse -Depth 2 src,docs/plans,ai/sessions`
Expected: new directories and the daily session file exist.
