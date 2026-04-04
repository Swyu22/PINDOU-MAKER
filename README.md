# Pindou

## 当前状态
- 状态：V1 MVP 已实现
- 形态：手机优先的本地 Web 应用
- 核心能力：导入图片、自动像素化、严格映射到 Mard 221、逐格编辑、PNG 图纸导出

## 技术栈
- Vite
- React 19
- TypeScript
- Vitest + Testing Library
- Canvas API（本地图像处理与导出）

## 顶层结构
- `CLAUDE.md`：项目入口规则
- `.cloud.md`：当前状态与下一步
- `package.json` / `package-lock.json`：前端依赖与锁文件
- `tsconfig.json` / `vvite.config.ts`：TypeScript 与构建配置
- `docs/`：上下文、计划、决策
- `ai/`：提示词、会话日志、输出物
- `src/`：前端源码与业务模块

## 本轮已落盘文件
- `package.json`
- `vvite.config.ts`
- `src/App.tsx`
- `src/styles.css`
- `src/modules/palette/mard221.ts`
- `src/modules/pattern/generator.ts`
- `src/modules/pattern/history.ts`
- `src/modules/export/sheet.ts`
- `docs/plans/2026-04-04-pindou-generator-implementation.md`
- `docs/30-decisions/adr-0001-local-first-vite-react.md`

## 运行方式
1. `npm install`
2. `npm test`
3. `npm run build`
4. `npm run dev`

## 数据说明
- V1 的 `Mard 221` 色库固定来源于 `https://www.pindou.online/colors` 在 `2026-04-04` 可访问到的 221 色标准色卡页面。
- 色库已本地固化到 `src/modules/palette/mard221.ts`，运行时不依赖外部网络。

## 下一步建议
1. 增加手动裁切入口和更细的移动端编辑手势
2. 增加真实设备手测与导出视觉验收
3. 评估 V2 的 PDF 导出与项目保存能力

## 2026-04-04 Update
- 修复移动端上传后布局跳动，编辑区、色板区和统计区在小屏下改为稳定尺寸加内部滚动。
- 修复小尺寸图纸里深色关键细节丢失，黑色眼睛这类锚点会优先保留。
- 已增加 GitHub Pages 支持：vite.config.ts 会在 Actions 中自动按仓库名设置 base，并新增 .github/workflows/deploy-pages.yml。

## GitHub Pages
- 当前项目是纯静态前端，没有运行时后端依赖，可以部署到 GitHub Pages。
- 若使用仓库 Pages，当前 workflow 会在 GitHub Actions 中自动按仓库名生成正确的静态资源子路径。
- 若后续不是部署到仓库子路径，可以用 BASE_PATH 环境变量覆盖默认 base。
## 2026-04-05 Update
- The core generator now uses a grid-first conversion path: sample each output cell from its full image region, compute a region-weighted average color, then map to the nearest Mard 221 code.
- Mobile preview now uses responsive cell sizing so the full chart fits the preview container before falling back to scroll.
- Verification baseline: 
pm test passes with 15 tests and 
pm run build passes.
