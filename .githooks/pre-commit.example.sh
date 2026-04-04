#!/usr/bin/env bash
set -e

# 1) 确保 .cloud.md 存在
if [ ! -f ".cloud.md" ]; then
  echo "[HOOK] 缺少 .cloud.md（当前状态快照），请先创建。"
  exit 1
fi

# 2) 文件行数告警（示例：仅检查 staged 文件）
MAX_LINES=800
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|py)$' || true)
for f in $FILES; do
  [ -f "$f" ] || continue
  LINES=$(wc -l < "$f" | tr -d ' ')
  if [ "$LINES" -gt "$MAX_LINES" ]; then
    echo "[HOOK] 警告: $f 行数为 $LINES，超过阈值 $MAX_LINES。建议拆分。"
    # 如需改为强制拦截：取消下一行注释
    # exit 1
  fi
done

echo "[HOOK] pre-commit checks passed (with warnings if any)."
