import { describe, expect, it } from 'vitest';

import { computePreviewCellSize, shouldRenderCellCode } from './preview';

describe('preview helpers', () => {
  it('fits a 32-column grid into a narrow mobile frame', () => {
    const cellSize = computePreviewCellSize({
      availableWidth: 320,
      columns: 32,
    });

    expect(cellSize).toBeGreaterThanOrEqual(8);
    expect(cellSize).toBeLessThanOrEqual(10);
  });

  it('keeps a 16-column grid comfortably larger on wider mobile frames', () => {
    const cellSize = computePreviewCellSize({
      availableWidth: 360,
      columns: 16,
    });

    expect(cellSize).toBeGreaterThanOrEqual(18);
    expect(cellSize).toBeLessThanOrEqual(22);
  });

  it('hides grid codes when the preview cells become too small', () => {
    expect(shouldRenderCellCode('code', 10)).toBe(false);
    expect(shouldRenderCellCode('code', 19)).toBe(true);
    expect(shouldRenderCellCode('color', 19)).toBe(false);
  });
});
