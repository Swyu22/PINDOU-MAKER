# Hook 落地建议（第一批）

## 目标
先做低成本高收益的检查，不一步到位。

## 第一批（建议先实现）
1. `.cloud.md` 存在性检查（pre-commit）
2. 文件行数 > 800 告警（可先告警后拦截）
3. （可选）新增模块目录时提醒补 README

## 第二批
- lint-staged + eslint/tsc/test
- 关键文件头说明检查（仅关键文件）
- Conventional Commits 校验（commit-msg）

## 第三批（按需）
- 组件库白名单（如 Arco Design）
- 跨层 import 边界检查
- 复杂度/嵌套/分支检查
- 架构变更触发 ADR 提示
