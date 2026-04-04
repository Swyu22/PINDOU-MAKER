/**
 * input: Current pattern cells and their dimensions.
 * output: Legend, section steps, and a high-resolution PNG drawing for sharing.
 * pos: Converts the editor state into a production-ready bead sheet without server rendering.
 */
import type { PatternCell, PatternDocument } from '../pattern/types';

type LegendEntry = {
  code: string;
  count: number;
  hex: string;
};

export type SheetModel = {
  legend: LegendEntry[];
  steps: string[];
  gridLabels: string[];
  gridColors: string[];
  width: number;
  height: number;
  sectionSize: number;
};

type LightweightPattern = {
  width: number;
  height: number;
  cells: Array<Pick<PatternCell, 'code' | 'hex'>>;
};

export function buildSheetModel(pattern: LightweightPattern): SheetModel {
  const counts = new Map<string, LegendEntry>();

  for (const cell of pattern.cells) {
    const existing = counts.get(cell.code);

    if (existing === undefined) {
      counts.set(cell.code, {
        code: cell.code,
        count: 1,
        hex: cell.hex,
      });
    } else {
      existing.count += 1;
    }
  }

  const legend = [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.code.localeCompare(right.code, 'en');
  });
  const sectionSize = pattern.width > 24 || pattern.height > 24 ? 8 : 4;
  const steps: string[] = [];
  let sectionNumber = 1;

  for (let row = 0; row < pattern.height; row += sectionSize) {
    for (let column = 0; column < pattern.width; column += sectionSize) {
      const endRow = Math.min(pattern.height, row + sectionSize);
      const endColumn = Math.min(pattern.width, column + sectionSize);
      steps.push(`步骤 ${sectionNumber}：先完成第 ${row + 1}-${endRow} 行，第 ${column + 1}-${endColumn} 列。`);
      sectionNumber += 1;
    }
  }

  return {
    legend,
    steps,
    gridLabels: pattern.cells.map((cell) => cell.code),
    gridColors: pattern.cells.map((cell) => cell.hex),
    width: pattern.width,
    height: pattern.height,
    sectionSize,
  };
}

export async function downloadSheetAsPng(pattern: PatternDocument) {
  const model = buildSheetModel(pattern);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('当前浏览器无法创建导出画布。');
  }

  const cellSize = pattern.width <= 16 && pattern.height <= 16 ? 74 : pattern.width <= 24 && pattern.height <= 24 ? 56 : 42;
  const padding = 48;
  const headerHeight = 140;
  const gridWidth = pattern.width * cellSize;
  const gridHeight = pattern.height * cellSize;
  const legendHeight = Math.max(180, model.legend.length * 34 + 88);
  const stepsHeight = model.steps.length * 34 + 110;

  canvas.width = Math.max(1080, gridWidth + padding * 2);
  canvas.height = headerHeight + gridHeight + legendHeight + stepsHeight + padding * 2;

  context.fillStyle = '#f6f0e6';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawHeader(context, canvas.width, pattern);
  drawGrid(context, model, padding, headerHeight, cellSize);
  drawLegend(context, model, padding, headerHeight + gridHeight + 44, canvas.width - padding * 2);
  drawSteps(context, model, padding, headerHeight + gridHeight + legendHeight, canvas.width - padding * 2);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result === null) {
        reject(new Error('导出 PNG 失败。'));
        return;
      }

      resolve(result);
    }, 'image/png');
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `pindou-pattern-${pattern.width}x${pattern.height}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function drawHeader(context: CanvasRenderingContext2D, canvasWidth: number, pattern: PatternDocument) {
  context.fillStyle = '#1f1a14';
  context.font = "700 44px 'Bodoni 72', 'Didot', serif";
  context.fillText('拼豆图纸生成器', 48, 70);

  context.fillStyle = '#6f5643';
  context.font = "500 22px 'Palatino Linotype', 'Book Antiqua', serif";
  context.fillText(`当前尺寸 ${pattern.width} × ${pattern.height} · Mard 221 标准色`, 48, 108);

  context.fillStyle = '#a24030';
  context.fillRect(canvasWidth - 220, 38, 144, 12);
  context.fillStyle = '#2f5f51';
  context.fillRect(canvasWidth - 220, 58, 108, 12);
}

function drawGrid(context: CanvasRenderingContext2D, model: SheetModel, startX: number, startY: number, cellSize: number) {
  const fontSize = model.width <= 16 && model.height <= 16 ? 14 : model.width <= 24 && model.height <= 24 ? 11 : 9;

  context.strokeStyle = '#d3c6b7';

  for (let row = 0; row < model.height; row += 1) {
    for (let column = 0; column < model.width; column += 1) {
      const index = row * model.width + column;
      const x = startX + column * cellSize;
      const y = startY + row * cellSize;

      context.fillStyle = model.gridColors[index];
      context.fillRect(x, y, cellSize, cellSize);
      context.lineWidth = column % model.sectionSize === 0 || row % model.sectionSize === 0 ? 2 : 1;
      context.strokeRect(x, y, cellSize, cellSize);

      context.fillStyle = pickReadableTextColor(model.gridColors[index]);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `700 ${fontSize}px 'Avenir Next Condensed', 'Franklin Gothic Medium', sans-serif`;
      context.fillText(model.gridLabels[index], x + cellSize / 2, y + cellSize / 2);
    }
  }
}

function drawLegend(context: CanvasRenderingContext2D, model: SheetModel, startX: number, startY: number, contentWidth: number) {
  context.fillStyle = '#1f1a14';
  context.font = "700 30px 'Bodoni 72', 'Didot', serif";
  context.textAlign = 'left';
  context.fillText('色号统计', startX, startY);

  context.font = "500 19px 'Palatino Linotype', 'Book Antiqua', serif";

  const columns = contentWidth > 1400 ? 3 : 2;
  const columnWidth = contentWidth / columns;

  model.legend.forEach((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = startX + column * columnWidth;
    const y = startY + 42 + row * 34;

    context.fillStyle = entry.hex;
    context.fillRect(x, y - 18, 22, 22);
    context.strokeStyle = '#c8b9a7';
    context.lineWidth = 1;
    context.strokeRect(x, y - 18, 22, 22);

    context.fillStyle = '#3f2c22';
    context.fillText(`${entry.code} · ${entry.count} 颗`, x + 36, y);
  });
}

function drawSteps(context: CanvasRenderingContext2D, model: SheetModel, startX: number, startY: number, contentWidth: number) {
  context.fillStyle = '#1f1a14';
  context.font = "700 30px 'Bodoni 72', 'Didot', serif";
  context.fillText('分区步骤', startX, startY);

  context.font = "500 18px 'Palatino Linotype', 'Book Antiqua', serif";
  context.fillStyle = '#4b3c2f';

  const wrappedSteps = model.steps.flatMap((step) => wrapText(step, Math.max(360, contentWidth - 16), context));
  wrappedSteps.forEach((line, index) => {
    context.fillText(line, startX, startY + 40 + index * 28);
  });
}

function wrapText(text: string, maxWidth: number, context: CanvasRenderingContext2D) {
  const lines: string[] = [];
  let current = '';

  for (const char of text) {
    const next = `${current}${char}`;

    if (context.measureText(next).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function pickReadableTextColor(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 150 ? '#1a140f' : '#fff7ed';
}
