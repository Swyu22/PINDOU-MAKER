import { startTransition, useEffect, useRef, useState, type CSSProperties, type ChangeEvent } from 'react';

import { downloadSheetAsPng } from './modules/export/sheet';
import { MARD_221_PALETTE } from './modules/palette/mard221';
import { generatePattern, loadImageFile, rasterizeImageToRawData, replacePatternCell } from './modules/pattern/generator';
import {
  createHistoryState,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
  type HistoryState,
} from './modules/pattern/history';
import { computePreviewCellSize, shouldRenderCellCode } from './modules/pattern/preview';
import type { GeneratorConfig, PatternDocument } from './modules/pattern/types';

const sizeOptions: GeneratorConfig['targetSize'][] = [16, 24, 32];
const defaultConfig: GeneratorConfig = {
  targetSize: 24,
  maxColors: MARD_221_PALETTE.length,
  smoothLevel: 0,
  previewMode: 'code',
};

function App() {
  const [config, setConfig] = useState<GeneratorConfig>(defaultConfig);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [history, setHistory] = useState<HistoryState<PatternDocument> | null>(null);
  const [selectedCode, setSelectedCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewFrameWidth, setPreviewFrameWidth] = useState(0);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const currentFile = sourceFile;

    if (currentFile === null) {
      return undefined;
    }

    async function rebuildPattern() {
      const file = currentFile;

      if (file === null) {
        return;
      }

      try {
        setStatus('processing');
        setErrorMessage('');

        const image = await loadImageFile(file);

        if (cancelled) {
          return;
        }

        const rawImage = rasterizeImageToRawData(image, config.targetSize);
        const pattern = generatePattern(rawImage, config);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setHistory(createHistoryState(pattern));
          setSelectedCode(pattern.cells[0]?.code ?? MARD_221_PALETTE[0].code);
          setStatus('ready');
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '图片处理失败，请换一张图再试。');
      }
    }

    void rebuildPattern();

    return () => {
      cancelled = true;
    };
  }, [config.maxColors, config.smoothLevel, config.targetSize, sourceFile]);

  useEffect(() => {
    const frame = previewFrameRef.current;

    if (frame === null || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.round(entries[0]?.contentRect.width ?? frame.clientWidth ?? 0);

      startTransition(() => {
        setPreviewFrameWidth((current) => (current === nextWidth ? current : nextWidth));
      });
    });

    observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, []);

  const activePattern = history?.present ?? null;
  const activePaletteCodes = activePattern === null ? [] : [...new Set(activePattern.cells.map((cell) => cell.code))];
  const activePalette = activePaletteCodes
    .map((code) => MARD_221_PALETTE.find((entry) => entry.code === code))
    .filter((entry): entry is (typeof MARD_221_PALETTE)[number] => entry !== undefined);
  const selectedColor = MARD_221_PALETTE.find((entry) => entry.code === selectedCode) ?? activePalette[0] ?? MARD_221_PALETTE[0];
  const legend = buildLegend(activePattern);
  const imageMeta =
    sourceFile === null
      ? null
      : {
          name: sourceFile.name,
          sizeKb: Math.round(sourceFile.size / 1024),
        };
  const generatedSize = activePattern === null ? `${config.targetSize} 长边预估` : `${activePattern.width} × ${activePattern.height}`;
  const previewCellSize =
    activePattern === null
      ? 0
      : computePreviewCellSize({
          availableWidth: previewFrameWidth > 0 ? previewFrameWidth : 320,
          columns: activePattern.width,
        });
  const showCellCode = activePattern !== null && shouldRenderCellCode(config.previewMode, previewCellSize);

  function handleConfigChange<K extends keyof GeneratorConfig>(key: K, value: GeneratorConfig[K]) {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSourceFile(file);
    setHistory(null);
    setErrorMessage('');
  }

  function handleCellPress(index: number) {
    if (history === null) {
      return;
    }

    if (history.present.cells[index]?.code === selectedColor.code) {
      return;
    }

    setHistory((current) => (current === null ? current : pushHistoryState(current, replacePatternCell(current.present, index, selectedColor.code))));
  }

  async function handleExport() {
    if (activePattern === null) {
      return;
    }

    await downloadSheetAsPng(activePattern);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">PINDOU / MARD 221</p>
          <h1>拼豆图纸生成器</h1>
          <p className="hero-text">
            导入一张已经裁好主体的图片，在浏览器里把它转换成可编辑的拼豆图纸。当前版本采用先分格、再按格计算区域加权平均色、再映射到 Mard 221 的逻辑，优先保留原图的主体轮廓和主要配色关系。
          </p>
        </div>
        <div className="hero-card">
          <p>当前策略</p>
          <ul>
            <li>先按目标格子切分图像区域</li>
            <li>每格使用区域加权平均色</li>
            <li>只在结果阶段做轻量限色和平滑</li>
          </ul>
        </div>
      </section>

      <section className="workspace">
        <aside className="control-panel">
          <div className="panel-card">
            <label className="input-label" htmlFor="image-upload">
              导入图片
            </label>
            <input accept="image/png,image/jpeg,image/webp" id="image-upload" onChange={handleFileSelection} type="file" />
            <p className="helper-text">默认你已经裁好主体，背景可以保留。系统会按图纸尺寸重新分格取样。</p>
            {imageMeta === null ? null : (
              <div className="meta-chip">
                <span>{imageMeta.name}</span>
                <span>{imageMeta.sizeKb} KB</span>
              </div>
            )}
          </div>

          <div className="panel-card">
            <label className="input-label" htmlFor="target-size">
              目标尺寸
            </label>
            <select
              id="target-size"
              value={config.targetSize}
              onChange={(event) => handleConfigChange('targetSize', Number(event.target.value) as GeneratorConfig['targetSize'])}
            >
              {sizeOptions.map((size) => (
                <option key={size} value={size}>
                  长边 {size}
                </option>
              ))}
            </select>

            <label className="input-label" htmlFor="max-colors">
              颜色上限
            </label>
            <input
              id="max-colors"
              max={MARD_221_PALETTE.length}
              min={2}
              type="range"
              value={config.maxColors}
              onChange={(event) => handleConfigChange('maxColors', Number(event.target.value))}
            />
            <span className="range-value">
              {config.maxColors} / {MARD_221_PALETTE.length} 色
            </span>

            <label className="input-label" htmlFor="smooth-level">
              平滑强度
            </label>
            <input
              id="smooth-level"
              max={3}
              min={0}
              type="range"
              value={config.smoothLevel}
              onChange={(event) => handleConfigChange('smoothLevel', Number(event.target.value))}
            />
            <span className="range-value">Level {config.smoothLevel}</span>

            <label className="input-label" htmlFor="preview-mode">
              预览模式
            </label>
            <select id="preview-mode" value={config.previewMode} onChange={(event) => handleConfigChange('previewMode', event.target.value as GeneratorConfig['previewMode'])}>
              <option value="code">格内色号</option>
              <option value="color">纯色块</option>
            </select>
          </div>

          <div className="panel-card">
            <div className="section-title-row">
              <span>操作</span>
              <span>{generatedSize}</span>
            </div>
            <div className="button-row">
              <button disabled={history === null || history.past.length === 0} type="button" onClick={() => setHistory((current) => (current === null ? current : undoHistoryState(current)))}>
                撤销
              </button>
              <button disabled={history === null || history.future.length === 0} type="button" onClick={() => setHistory((current) => (current === null ? current : redoHistoryState(current)))}>
                重做
              </button>
            </div>
            <button className="primary-button" disabled={activePattern === null} type="button" onClick={() => void handleExport()}>
              导出 PNG 图纸
            </button>
            <p className="helper-text">导出内容包含网格、格内色号、色号统计和分区步骤。预览自适配只影响屏幕显示，不影响导出结果。</p>
          </div>
        </aside>

        <section className="editor-panel">
          <div className="editor-header">
            <div>
              <p className="eyebrow">本地处理状态</p>
              <h2>
                {status === 'idle'
                  ? '等待导入图片'
                  : status === 'processing'
                    ? '正在生成拼豆预览'
                    : status === 'error'
                      ? '生成失败'
                      : '图纸已可编辑'}
              </h2>
            </div>
            <p className="status-pill">{status === 'ready' ? 'READY' : status.toUpperCase()}</p>
          </div>

          {errorMessage === '' ? null : <div className="error-banner">{errorMessage}</div>}

          {activePattern === null ? (
            <div className="empty-state">
              <p>导入图片后，这里会生成拼豆预览。</p>
              <p>现在的逻辑是按格取样，不再直接把整张图先抹平再映射颜色。</p>
            </div>
          ) : (
            <>
              <div className="palette-strip">
                {activePalette.map((entry) => (
                  <button
                    key={entry.code}
                    className={entry.code === selectedCode ? 'swatch active' : 'swatch'}
                    type="button"
                    style={{ backgroundColor: entry.hex }}
                    onClick={() => setSelectedCode(entry.code)}
                  >
                    <span>{entry.code}</span>
                  </button>
                ))}
              </div>

              <div ref={previewFrameRef} className="pattern-frame">
                <div
                  className="pattern-grid"
                  style={
                    {
                      '--columns': String(activePattern.width),
                      '--cell-size': `${previewCellSize}px`,
                    } as CSSProperties
                  }
                >
                  {activePattern.cells.map((cell, index) => (
                    <button
                      key={`${cell.code}-${index}`}
                      className={cell.code === selectedCode ? 'pattern-cell active' : 'pattern-cell'}
                      type="button"
                      style={{ backgroundColor: cell.hex, color: getReadableTextColor(cell.hex) }}
                      onClick={() => handleCellPress(index)}
                    >
                      {showCellCode ? <span>{cell.code}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="insight-panel">
          <div className="panel-card">
            <div className="section-title-row">
              <span>选中色号</span>
              <span>{selectedColor.code}</span>
            </div>
            <div className="selected-color" style={{ backgroundColor: selectedColor.hex }}>
              <span>{selectedColor.hex}</span>
            </div>
            <p className="helper-text">先选色，再点击网格里的单元格进行替换。</p>
          </div>

          <div className="panel-card">
            <div className="section-title-row">
              <span>色号统计</span>
              <span>{legend.length} 种</span>
            </div>
            <div className="legend-list">
              {legend.length === 0 ? (
                <p className="helper-text">生成图纸后会显示颜色统计。</p>
              ) : (
                legend.map((entry) => (
                  <div key={entry.code} className="legend-item">
                    <span className="legend-swatch" style={{ backgroundColor: entry.hex }} />
                    <span>{entry.code}</span>
                    <strong>{entry.count}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel-card">
            <div className="section-title-row">
              <span>处理说明</span>
              <span>V1</span>
            </div>
            <ul className="note-list">
              <li>颜色严格限制在 Mard 221。</li>
              <li>先分格取样，再做轻量限色和碎点清理。</li>
              <li>移动端预览优先完整显示整张图纸。</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}

function buildLegend(pattern: PatternDocument | null) {
  if (pattern === null) {
    return [];
  }

  const counts = new Map<string, { code: string; count: number; hex: string }>();

  for (const cell of pattern.cells) {
    const entry = counts.get(cell.code);

    if (entry === undefined) {
      counts.set(cell.code, {
        code: cell.code,
        count: 1,
        hex: cell.hex,
      });
    } else {
      entry.count += 1;
    }
  }

  return [...counts.values()].sort((left, right) => right.count - left.count);
}

function getReadableTextColor(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 140 ? '#20160f' : '#fff8ef';
}

export default App;
