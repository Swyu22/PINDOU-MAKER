/**
 * input: Preview frame width, grid columns, and preview mode.
 * output: Responsive preview sizing decisions for the grid renderer.
 * pos: Keeps mobile preview fitting logic testable outside the React shell.
 */
import type { PreviewMode } from './types';

type PreviewCellSizeInput = {
  availableWidth: number;
  columns: number;
  gap?: number;
  horizontalPadding?: number;
  minCellSize?: number;
  maxCellSize?: number;
};

export function computePreviewCellSize({
  availableWidth,
  columns,
  gap = 2,
  horizontalPadding = 12,
  minCellSize = 8,
  maxCellSize = 36,
}: PreviewCellSizeInput) {
  if (columns <= 0) {
    return minCellSize;
  }

  const usableWidth = Math.max(availableWidth - horizontalPadding * 2, minCellSize * columns);
  const totalGapWidth = gap * Math.max(columns - 1, 0);
  const nextCellSize = Math.floor((usableWidth - totalGapWidth) / columns);

  return Math.min(Math.max(nextCellSize, minCellSize), maxCellSize);
}

export function shouldRenderCellCode(previewMode: PreviewMode, cellSize: number) {
  return previewMode === 'code' && cellSize >= 18;
}
