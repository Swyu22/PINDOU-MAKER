# AI_WORK_CONSTITUTION（项目宪法 / 按需读取）

> 用途：跨设备 / 跨模型协作时的完整工作流规范。
> 注意：不是每次都全读；请按任务复杂度渐进加载。

## 1. 核心原则（最高优先级）
1. 文件系统是唯一可靠状态源（SSOT）
2. Hook / 自动检查 > Prompt 口头约束
3. 渐进式上下文加载 > 全量灌入
4. 质量标准必须量化为可判定阈值
5. 计划与进度必须落到项目文件，不依赖会话记忆
6. 工具原生能力可利用，但不得替代项目内状态文件

## 2. 四层协作架构
- 入口层：`CLAUDE.md`
- 状态层：`.cloud.md` + `docs/20-plan/*` + `ai/sessions/*`
- 宪法层：本文件
- 机械执行层：Hooks / Lint / Checks

## 3. 启动前默认读取顺序（局部任务）
1. `CLAUDE.md`
2. `/.cloud.md`
3. 目标模块 README / `_module.md`
4. 目标文件 + 相邻关键文件
5. 如需跨模块/架构改动，再读 `PROJECT_MAP` / `spec` / `ADR` / `plan`

## 4. 分形文档（V2，降低维护成本）
### 4.1 必须有：根目录全局地图
维护 `docs/00-context/PROJECT_MAP.md`：目标、约束、模块边界、文档索引、阅读路径。

### 4.2 建议有：模块 README（3–5 行）
每个重要模块目录维护简短 README：模块定位、边界、对外接口、文件清单（可逐步补齐）。

### 4.3 关键文件头说明（关键文件强制，普通文件可选）
关键文件包括：模块入口、服务层、适配层、带副作用文件、跨模块桥接文件。
推荐格式：
```ts
/**
 * input: 依赖什么
 * output: 提供什么
 * pos: 在系统局部中的地位
 * 更新提醒：职责/依赖/输出变化时同步更新本注释与模块 README
 */
```

## 5. 计划与断点续作（必须落文件）
- 计划文件放在 `docs/20-plan/`
- 使用 checklist
- 完成一项立即回写一项
- 新会话恢复顺序：`.cloud.md` → `current-iteration.md` → 最新 session → 相关模块文档

## 6. 质量红线（可由 Hook 检查）
默认阈值（可按项目调整并写回文档）：
- 单文件 ≤ 800 行
- 单函数 ≤ 30 行
- 嵌套层级 ≤ 3
- 分支数量 ≤ 3
- 禁止无边界巨石文件 / 上帝函数
- 新增关键文件必须有头部说明

### 超限处理（不得静默）
必须说明原因、给出替代方案、记录到 ADR 或 session、登记后续重构计划。

## 7. 渐进式上下文加载策略
### 修 bug（局部）
读取：`CLAUDE.md` → `.cloud.md` → 模块 README → 目标文件 + 直接相关文件 → 必要日志

### 单模块功能开发
在修 bug 基础上增加：相关 spec + 当前 plan

### 跨模块重构 / 接口变更
增加：`PROJECT_MAP.md` + 涉及模块 README + 相关 ADR + 当前 plan

### 架构决策
读取：`docs/00-context/*` + `docs/10-spec/*` + `docs/20-plan/*` + `docs/30-decisions/*` + 涉及模块文档（按需抽样）

## 8. 标准流程（Start → Plan → Execute → Verify → Sync → Close）
### Start
- 读取入口与状态文件，明确目标 / 范围 / 验收标准

### Plan
- 在 `docs/20-plan/current-iteration.md` 或 `ai/sessions/YYYY-MM-DD.md` 写 checklist（目标、约束、验收、影响范围、回写清单）

### Execute
- 在约束内修改代码/文档；优先局部修改；必要时追加读取上下文

### Verify
- 构建 / 测试 / lint / hook
- 自检复杂度与边界

### Sync（回写）
按顺序：
1. 关键文件头说明（若变更）
2. 模块 README（若结构/职责变更）
3. `PROJECT_MAP.md`（若架构边界变更）
4. `.cloud.md`
5. plan/checklist
6. ADR（若有关键决策）
7. `ai/sessions/YYYY-MM-DD.md`

### Close（收工）
输出 Daily 或 Milestone Session Summary，并写入 `ai/sessions/YYYY-MM-DD.md` 后再提交代码。

## 9. 收工模板（双层）
### 9.1 Daily（默认）
```md
## Session Summary (Daily)

### Last Done
- 已完成：
- 已验证：

### Next Actions（Priority）
1. P0:
2. P1:
3. P2:

### Key Decisions
- 本次无新增关键决策
# 或
- 决策：
- 原因：
- 影响：
```

### 9.2 Milestone（复杂任务）
```md
### 今日目标完成情况（对照最初目标逐条勾选）
- [ ] 目标1：
- [ ] 目标2：

### 关键变更清单（文件路径 + 做了什么 + 为什么）
- `path/to/file`：做了什么；为什么

### 关键决策（ADR）（背景/方案A/方案B/选择/影响）
- 背景：
- 方案A：
- 方案B：
- 选择：
- 影响：

### 未完成 & 下一步（按优先级）
1. P0：
2. P1：
3. P2：

### 可复用提示词（可选）
1. ...
2. ...
```

## 10. 违规处理
若发现状态文件过期、文档缺失、Hook 失败、明显超限：
1. 列出违规项
2. 先修结构与文档，再继续开发
3. 必要时记录 ADR
4. 在 session summary 留痕
