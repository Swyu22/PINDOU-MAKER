# PROJECT_MAP

## 项目目标（What）
- 业务目标：把用户导入的图片转换为可制作的拼豆图纸，并严格落到 `Mard 221` 色号体系中。
- 当前阶段目标：交付 `V1 本地优先编辑器`，支持图片导入、自动像素化、颜色统一、逐格编辑和 PNG 图纸导出。
- 成功标准：图片能在浏览器本地处理；输出只使用 Mard 221；小尺寸图纸可辨认；用户可改单格并导出。

## 关键约束（Constraints）
- 技术约束：前端单体，`Vite + React + TypeScript`；浏览器本地 Canvas 处理；无后端。
- UI/组件约束：手机优先；允许桌面增强；避免复杂多页流程。
- 性能/安全约束：图片不上传服务端；运行时不依赖外部色库接口。
- 时间/资源约束：V1 聚焦单图导入、自动生成、轻编辑、PNG 导出。
- 协作约束：文件系统为 SSOT；修改后必须同步 `.cloud.md`、`current-iteration.md`、`ai/sessions/*`。

## 模块地图（Modules）
- `src/App.tsx`：应用页壳，组织上传、参数、编辑和导出流程。
- `src/modules/palette/`：Mard 221 色库与颜色查找。
- `src/modules/pattern/`：图片缩放、像素量化、颜色限制、平滑、编辑历史。
- `src/modules/export/`：图纸布局、色号统计、分区步骤、PNG 渲染。
- `src/shared/`：预留共享层；当前暂无运行时代码。
- `docs/`：上下文、计划与决策记录；不参与运行时。
- `ai/`：模型协作提示词和会话日志；不参与运行时。

## 依赖规则（Dependencies）
- `src/App.tsx` -> `src/modules/*`：允许
- `src/modules/pattern/*` -> `src/modules/palette/*`：允许
- `src/modules/export/*` -> `src/modules/pattern/types.ts`：允许
- `src/modules/palette/*` -> `src/modules/pattern/*`：禁止
- `src/shared/*` -> `src/modules/*`：禁止
- `src/*` -> `docs/*`、`ai/*`：禁止运行时依赖

## 数据与接口（Data/API）
- 关键数据流：`File` -> `HTMLImageElement` -> `ImageData` -> 像素量化 -> `PatternDocument` -> 手动编辑 -> `SheetModel` -> PNG 下载
- 外部 API：无运行时外部 API；仅在开发时从公开色卡页面提取 V1 色库。
- 内部接口约定：
  - `GeneratorConfig`：`targetSize`、`maxColors`、`smoothLevel`、`previewMode`
  - `PatternDocument`：`width`、`height`、`cells`
  - `SheetModel`：图纸图例、步骤、格内文本和布局元数据

## 文档索引（Docs Index）
- Context：`/docs/00-context/...`
- Plan：`/docs/20-plan/current-iteration.md`
- Detailed Plans：
  - `/docs/plans/2026-04-04-bootstrap-mvs.md`
  - `/docs/plans/2026-04-04-pindou-generator-implementation.md`
- ADR：`/docs/30-decisions/adr-0001-local-first-vite-react.md`
- Sessions：`/ai/sessions/...`

## 阅读路径（How to Load Context）
- 接手开发：读 `CLAUDE.md` → `.cloud.md` → `docs/20-plan/current-iteration.md` → 最新 `ai/sessions/*`
- 修算法：+ `src/modules/pattern/*` → `src/modules/palette/mard221.ts`
- 改导出：+ `src/modules/export/sheet.ts`
- 改架构：+ 本文件 → ADR → 相关模块 README

## Deployment Notes
- 产物必须保持纯静态，可直接部署到 GitHub Pages 一类的静态托管环境。
- .github/workflows/deploy-pages.yml 负责 GitHub Pages 自动部署。
- 生产构建需要在仓库子路径下正确加载静态资源，当前由 vite.config.ts 自动处理 base。
## Update 2026-04-05
- Pattern generation now follows:
  File -> sampling raster -> region-weighted average per target cell -> nearest Mard 221 match -> light post-process -> PatternDocument
- Preview rendering now depends on responsive preview helpers in src/modules/pattern/preview.ts.
