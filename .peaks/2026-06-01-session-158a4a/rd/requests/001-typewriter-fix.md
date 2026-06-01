# RD Request typewriter-fix

- session: 2026-06-01-session-158a4a
- linked-prd: .peaks/2026-06-01-session-158a4a/prd/requests/typewriter-fix.md
- linked-ui:  .peaks/2026-06-01-session-158a4a/ui/requests/typewriter-fix.md  (when UI involved)
- type: bugfix

## Red-line scope

- in-scope files / routes / API paths / data models
- explicit out-of-scope surfaces (do not modify, mock, delete, or replace)

## Standards preflight

- peaks standards init/update --project <path> --dry-run output paths and status
- planned application: apply | review-only | blocked

## OpenSpec linkage (when openspec/ exists)

- change-id: <openspec change id>
- entry validate: peaks openspec validate <change-id> data.valid status
- to-rd projection: peaks openspec to-rd <change-id> artifact path
- exit validate (after implementation): status

## Coverage status

- current total UT coverage: <percent>
- new/changed code coverage: <percent>
- gate verdict: pass | legacy-accepted | blocked

## Slice contract

- slice id, functional boundary, pre-refactor behavior, target structure, unit-test requirements, acceptance checks, rollback plan, commit boundary

## Implementation evidence

- diff paths, test commands + outputs, code review findings + fixes, security review findings + fixes, dry-run output

## MCP usage (when external docs lookup was used)

- capabilityId / tool / sanitized args
- artifact path of stored result
- no secrets, no full network bodies

## Handoff

- to peaks-qa: .peaks/2026-06-01-session-158a4a/qa/requests/typewriter-fix.md
- to peaks-sc: .peaks/2026-06-01-session-158a4a/sc/commit-boundaries/typewriter-fix.md

## Status

- created: 2026-06-01T07:08:37.789Z
- last update: 2026-06-01T07:08:37.789Z
- state: draft
