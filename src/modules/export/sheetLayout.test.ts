import { describe, expect, it } from 'vitest';

import { buildSheetModel } from './sheet';

describe('buildSheetModel', () => {
  it('produces legend totals and printable steps from the current pattern', () => {
    const model = buildSheetModel({
      width: 2,
      height: 2,
      cells: [
        { code: 'A1', hex: '#FAF4C8' },
        { code: 'A10', hex: '#F77C31' },
        { code: 'A1', hex: '#FAF4C8' },
        { code: 'A10', hex: '#F77C31' },
      ],
    });

    expect(model.legend).toEqual([
      { code: 'A1', count: 2, hex: '#FAF4C8' },
      { code: 'A10', count: 2, hex: '#F77C31' },
    ]);
    expect(model.steps.length).toBeGreaterThan(0);
    expect(model.gridLabels).toEqual(['A1', 'A10', 'A1', 'A10']);
  });
});
