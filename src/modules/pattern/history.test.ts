import { describe, expect, it } from 'vitest';

import { createHistoryState, pushHistoryState, redoHistoryState, undoHistoryState } from './history';

describe('history state', () => {
  it('supports undo and redo for edited grids', () => {
    const first = ['A1', 'A1'];
    const second = ['A1', 'A10'];
    const third = ['A10', 'A10'];

    const initial = createHistoryState(first);
    const withSecond = pushHistoryState(initial, second);
    const withThird = pushHistoryState(withSecond, third);

    const undone = undoHistoryState(withThird);
    const redone = redoHistoryState(undone);

    expect(undone.present).toEqual(second);
    expect(redone.present).toEqual(third);
  });
});
