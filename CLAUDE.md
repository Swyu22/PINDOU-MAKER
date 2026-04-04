# CLAUDE.md（项目入口规则）

你接手本项目时，先不要直接写代码。

## 强制读取顺序（不得跳过）

开始任何工作前，按此顺序读取：

| 步骤 | 文件 | 内容 |
|------|------|------|
| 1 | `.cloud.md` | 当前目标 / 进度断点 / 下一步 |
| 2 | `docs/00-context/PROJECT_MAP.md` | 模块地图 / 依赖规则 |
| 3 | 目标模块 `README.md` | 职责边界 / 文件清单 |
| 4 | 目标文件本身 | 实际代码 |

**跳过以上步骤直接写代码 = 违规。**

## 三条最高优先禁止项

1. **禁止**：只改代码不更新 `.cloud.md`（完成里程碑子任务后必须回写）
2. **禁止**：新增文件不登记到所属模块 `README.md` 的文件清单
3. **禁止**：跨越模块依赖边界乱引用（规则见 PROJECT_MAP.md § 依赖规则）

## 必做读取顺序（默认）
1. `/.cloud.md`
2. 目标模块 `README.md`（或 `_module.md`）
3. 目标文件 + 相邻关键文件（必要时）
4. 复杂任务再读 `/docs/00-context/PROJECT_MAP.md`、spec、ADR、plan

## 最高优先规则（禁止跳过）
- 文件系统是唯一可靠状态源，不能只依赖会话记忆
- 改完代码必须回写 `.cloud.md` 与相关文档（如有变更）
- 优先渐进式上下文加载，不要默认全量读取
- 遵守质量红线与 Hook 检查，Hook 失败不得强推
- 架构/接口关键决策必须沉淀到 ADR 或会话摘要

## 规范入口（按需读取）
- 宪法文档：`/docs/00-context/AI_WORK_CONSTITUTION.md`
- 全局地图：`/docs/00-context/PROJECT_MAP.md`
- 当前状态：`/.cloud.md`
- 当前计划：`/docs/20-plan/current-iteration.md`（如存在）
- 会话摘要：`/ai/sessions/`

每次工作结束必须进入“收尾落盘模式”：至少更新 /.cloud.md 与 /ai/sessions/YYYY-MM-DD.md，否则视为未完成。