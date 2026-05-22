# Testing Standards

Source: Extracted from project `CLAUDE.md` to keep the root instruction file compact.
Scope: project-local test and verification requirements.

## E2E Requirement

Every completed feature must be verified with Playwright MCP and must produce a report under `reports/`.

Flow:
1. Complete the feature.
2. Run Playwright MCP end-to-end verification.
3. Generate a report in `reports/`.
4. Treat the feature as complete only after verification passes or known issues are documented.

## E2E Report Naming

Use this format:

```text
reports/[功能名称]_E2E_TEST_REPORT_YYYYMMDD.md
```

## E2E Report Content

Each report must include:
- Test time in ISO 8601 or clear local timestamp format
- Tested feature description
- Detailed test steps
- Pass/fail result
- Screenshot evidence when useful
- Issue list with priority and status

## Required Scenario Coverage

Each feature must cover:
- Happy path
- Form validation
- Boundary conditions: empty values, special characters, overly long input
- Permission control: unauthenticated and unauthorized access
- Error handling: server failures and user-facing feedback

## Pre-Completion Checklist

Before marking a feature complete:
- [ ] E2E test executed
- [ ] Test report generated in `reports/`
- [ ] No CRITICAL or HIGH issues remain
- [ ] Test result passes or known issues are documented
- [ ] Major changes have regression coverage
