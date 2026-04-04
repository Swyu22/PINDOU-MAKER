import { describe, expect, it } from 'vitest';

import { MARD_221_PALETTE } from './mard221';

describe('MARD_221_PALETTE', () => {
  it('contains exactly 221 unique palette entries', () => {
    expect(MARD_221_PALETTE).toHaveLength(221);

    const codes = new Set(MARD_221_PALETTE.map((entry) => entry.code));

    expect(codes.size).toBe(221);
  });

  it('stores normalized uppercase hex values', () => {
    expect(MARD_221_PALETTE.every((entry) => /^#[0-9A-F]{6}$/.test(entry.hex))).toBe(true);
  });
});
