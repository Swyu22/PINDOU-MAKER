# 当前迭代计划（current-iteration）

## Iteration Goal
- 完成拼豆图纸生成器 V1 的首轮可运行交付，并把状态、计划和关键决策同步到文件系统。

## Scope（In / Out）
- In Scope：前端工程初始化；Mard 221 色库固化；图片像素化与平滑；逐格编辑；撤销/重做；PNG 图纸导出；自动化测试；文档回写。
- Out of Scope：PDF、账号、云存储、服务端处理、自动抠图、扩展色库。

## Checklist
- [x] 初始化 Vite + React + TypeScript + Vitest 工程
- [x] 固化 Mard 221 本地色库并验证总量为 221
- [x] 实现图片导入、量化、平滑和颜色上限控制
- [x] 实现逐格编辑与撤销/重做
- [x] 实现带网格、格内色号、色号统计、分区步骤的 PNG 图纸导出
- [x] 通过自动化测试与生产构建
- [x] 启动局域网可访问的本地验收实例并验证返回 200
- [x] 回写 `.cloud.md`、`PROJECT_MAP.md`、`ai/sessions/2026-04-04.md`、README、ADR

### Update 2026-04-04 21:36
- [x] 修复移动端上传后面板尺寸跳动与内容挤压
- [x] 修复深色关键像素在限色和平滑后丢失的问题
- [x] 增加 GitHub Pages 构建子路径支持与自动部署 workflow
## Risks / Dependencies
- 风险：当前导出和编辑体验已经可用，但仍缺真实手机触屏验收。
- 风险：色库来源依赖公开色卡页面，若后续品牌标准更新需重新校准。
- 依赖：后续如进入 V2，需要用户确认 PDF、本地缓存或更多图纸标记需求。

## Docs To Update
- [x] `.cloud.md`
- [x] 根目录 / 模块 README
- [x] `PROJECT_MAP.md`
- [x] ADR
- [x] `ai/sessions/2026-04-04.md`

## Last Updated
- 2026-04-04 21:36

### Update 2026-04-05 00:16
- [x] 本地预览实例已重新启动
- [x] 桌面与局域网地址均验证返回 `200`
- [x] 已提供真机验收地址 `http://192.168.2.104:4173`

### Update 2026-04-05 00:56
- [x] 重写生成器为按格取样 + 区域加权平均色 + 后置限色
- [x] 增加移动端预览自适配逻辑
- [x] 全量测试与生产构建通过
### Update 2026-04-05 01:20
- [x] Replace smoothing-first conversion with grid-first region-weighted average sampling.
- [x] Make mobile preview fit the viewport before falling back to scroll.
- [x] Initialize local git, merge remote bootstrap history, and push to origin/main.
- [ ] Verify the GitHub Pages workflow run and confirm the public preview URL.
### Update 2026-04-05 01:33
- [x] Diagnose GitHub Pages deploy failure from Actions log.
- [x] Harden deploy workflow with configure-pages and explicit deploy permissions.
- [ ] Repo owner to enable Pages -> GitHub Actions in repository settings and rerun deployment.
### Update 2026-04-05 01:47
- [x] Confirm remote HEAD still matches the latest pushed Pages build commit.
- [x] Check DNS resolution for the Pages domain.
- [ ] Direct HTTPS rendering verification still needs to be performed from a network that can reach github.io:443.
### Update 2026-04-05 02:00
- [x] Improve palette matching to account for hue, saturation, and lightness instead of Lab only.
- [x] Preserve color-bucket diversity when maxColors is lower than the full used palette.
- [x] Raise default and maximum UI color budget to the full Mard 221 palette.
- [x] Re-verify generator regressions, full test suite, and production build.
### Update 2026-04-05 02:14
- [x] Add 48x48 as a selectable chart size.
- [x] Make mobile preview denser so 48-column charts remain inspectable on phones.
- [x] Expand subtle same-family warm gradients across more Mard palette steps.
- [x] Re-run targeted regressions, full tests, and production build.
### Update 2026-04-05 03:02
- [x] Rework generator from color-only selection to outline-priority cell analysis.
- [x] Preserve bright catchlights and dark boundary anchors with dedicated contrast-priority matching.
- [x] Add contour regressions for eye highlights and subject/background edge bands.
- [x] Re-run full tests and production build after the outline-priority change.

### Update 2026-04-05 03:28
- [x] Analyze user-provided bead-art references and extract the target rendering characteristics.
- [x] Reject heavy contour-first generation as the current root style defect.
- [x] Lock the next generator rework direction to mass-first rendering with thin contours and protected micro-anchors.
- [x] Write docs/plans/2026-04-05-mass-first-thin-outline-pattern-implementation.md as the executable implementation plan.
- [ ] Execute the new mass-first thin-outline rework and re-verify visual quality on representative images.

### Update 2026-04-05 10:30
- [x] Replace contour-priority selection with a mass-first base layer plus thin contour and micro-anchor overlays.
- [x] Add regressions for thick silhouette rings and internal warm seams.
- [x] Collapse multi-cell dark border runs back toward a single exterior contour.
- [x] Re-run targeted generator regressions, full tests, and production build.
- [ ] Re-check the updated style against real user images in browser preview.
