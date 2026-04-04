# ADR-0001: 采用本地优先的 Vite + React 前端单体实现拼豆图纸生成器

- 日期：2026-04-04
- 状态：Accepted
- 相关模块：`src/App.tsx`、`src/modules/palette/*`、`src/modules/pattern/*`、`src/modules/export/*`
- 相关任务 / Session：`docs/plans/2026-04-04-pindou-generator-implementation.md` / `ai/sessions/2026-04-04.md`

## 背景（Context）
- V1 目标是尽快交付一个可运行的拼豆图纸生成器。
- 用户要求图片本地处理，不要账号和云存储。
- 核心价值集中在本地量化、颜色统一、逐格编辑和 PNG 图纸导出。

## 备选方案（Options）
### 方案 A
- 描述：直接做带后端的完整 Web 产品
- 优点：后续扩展项目保存、跨设备同步更自然
- 缺点：偏离 V1 目标；需要上传链路、存储和权限设计

### 方案 B
- 描述：采用 Vite + React + TypeScript 前端单体，全部在浏览器本地处理
- 优点：实现快；隐私边界清晰；最符合 V1 无账号、本地处理约束
- 缺点：移动端性能和导出体验需要更多本地优化

## 决策（Decision）
- 选择方案 B。
- V1 采用 `Vite + React + TypeScript + Canvas API`，在浏览器端完成导入、量化、编辑和导出。

## 影响（Consequences）
### 短期
- 可以快速交付可运行 MVP
- 运行时无需后端和外部接口
- 色库必须固化到本地代码中

### 长期
- 如需项目保存、PDF、账号或多设备同步，需要新增持久化层
- 未来如需更高性能，可把量化和平滑逻辑迁移到 Web Worker

## 后续行动（Follow-ups）
- [ ] 做真实手机端编辑与导出验收
- [ ] 评估裁切入口和 PDF 导出是否进入 V2
