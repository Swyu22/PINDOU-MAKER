/**
 * input: Raw imported pixels, generator config, and palette-constrained cell data.
 * output: Shared types for pattern generation, editing, and export.
 * pos: Contract layer between the pure pattern modules and the React UI shell.
 */
export type PreviewMode = 'color' | 'code';

export type GeneratorConfig = {
  targetSize: 16 | 24 | 32;
  maxColors: number;
  smoothLevel: number;
  previewMode: PreviewMode;
};

export type RawImageDataLike = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type PatternCell = {
  code: string;
  hex: string;
  name: string;
  rgb: [number, number, number];
};

export type PatternDocument = {
  width: number;
  height: number;
  cells: PatternCell[];
};
