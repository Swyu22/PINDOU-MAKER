# AI 协作工作流 SOP（新建项目 / 新模型接手通用）

## SOP-0：新建项目初始化（30–60 分钟）
1. 将本 Starter Kit 复制到项目根目录
2. 填写 `/.cloud.md`（当前目标、范围、下一步）
3. 填写 `docs/00-context/PROJECT_MAP.md`（目标、约束、模块地图）
4. 创建首个 `ai/sessions/YYYY-MM-DD.md`（可复制模板）
5. （可选）创建第一批模块 README（重要模块先建）
6. （可选）启用第一批 Hook

## SOP-1：每次开工（公司/家里都一样）
1. 打开项目根目录
2. 打开或新建 `ai/sessions/YYYY-MM-DD.md`
3. 将 `ai/prompts/UNIFIED_START_PROMPT.md` 发给当前模型
4. 确认模型先读取：`CLAUDE.md` → `.cloud.md` → 模块 README → 目标文件
5. 审核模型输出的执行计划与回写清单
6. 再开始执行

## SOP-2：执行中（控制熵增）
1. 任务是 bugfix：只读局部（状态 + 模块 + 目标文件）
2. 任务是架构/跨模块：追加读取 `PROJECT_MAP` / spec / ADR / plan
3. 不允许默认全量灌入所有文档
4. 如出现关键决策，立即标记需要 ADR 或 Milestone Summary

## SOP-3：每次收工（必须回写）
1. 要求模型输出 Session Summary（Daily 或 Milestone）
2. 将总结写入 `ai/sessions/YYYY-MM-DD.md`
3. 更新 `/.cloud.md`（Last Done / Next Actions / Risks / Last Updated）
4. 若本次改动影响结构或职责：更新模块 README / `PROJECT_MAP.md`
5. 若本次有关键决策：写 ADR 到 `docs/30-decisions/`
6. 更新 `docs/20-plan/current-iteration.md` checklist
7. 再 commit + push（建议使用 Conventional Commits）

## SOP-4：交给新模型（完整交接）
1. 将 `ai/prompts/NEW_MODEL_HANDOFF_PROMPT.md` 发给新模型
2. 明确指定本次任务类型：Bugfix / Feature / Refactor / Architecture
3. 指定目标模块/文件（如已知）
4. 要求模型先输出“读取清单 + 理解摘要 + 执行计划 + 回写清单”
5. 通过后再允许其进入执行

## SOP-5：每周（建议）
1. 回看 `ai/sessions` 提炼高价值提示词到 `ai/prompts/`
2. 整理 `docs/30-decisions`，标记已过时 ADR
3. 检查 `PROJECT_MAP.md` 是否与实际结构脱节
4. 逐步增加 Hook（先告警，后拦截）
