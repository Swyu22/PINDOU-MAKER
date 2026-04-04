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
  gap,
  horizontalPadding = 12,
  minCellSize,
  maxCellSize = 36,
}: PreviewCellSizeInput) {
  if (columns <= 0) {
    return minCellSize ?? 8;
  }

  const resolvedGap = gap ?? (columns >= 40 ? 1 : 2);
  const resolvedMinCellSize = minCellSize ?? (columns >= 40 ? 5 : columns >= 32 ? 6 : 8);
  const usableWidth = Math.max(availableWidth - horizontalPadding * 2, resolvedMinCellSize * columns);
  const totalGapWidth = resolvedGap * Math.max(columns - 1, 0);
  const nextCellSize = Math.floor((usableWidth - totalGapWidth) / columns);

  return Math.min(Math.max(nextCellSize, resolvedMinCellSize), maxCellSize);
}

export function shouldRenderCellCode(previewMode: PreviewMode, cellSize: number) {
  return previewMode === 'code' && cellSize >= 18;
}
