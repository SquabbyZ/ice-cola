---
name: context-monitor
enabled: true
event: stop
action: warn
---

## Context 使用率检查

检查 .claude/session-state.json 中的 contextEstimate 值：
- 如果 >= 70%: 提醒用户 context 已超过 70%，建议重启会话或执行 /compact
- 如果 >= 90%: 强烈警告，context 即将耗尽
