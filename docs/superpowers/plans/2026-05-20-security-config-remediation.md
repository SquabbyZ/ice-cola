# Security Config Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove committed live-looking secrets, keep local development easy, and fail closed for missing server secrets.

**Architecture:** Docker Compose reads secrets from environment variables with explicit development fallbacks only where safe. Server startup validates required runtime secrets through a small config helper used by JWT registration and auth verification. Documentation points developers to example env files without publishing real credentials.

**Tech Stack:** Docker Compose, NestJS ConfigService, TypeScript, Jest, pnpm.

---

## File Map

- Modify `docker-compose.yml`: replace hardcoded runtime secrets with `${VAR:-dev-only-placeholder}` or empty placeholders, and bind insecure dashboard to localhost by default.
- Modify `packages/server/.env.example`: align database name/port with project, add AI/email variables, mark dev-only values.
- Create `packages/server/src/config/security-config.ts`: central helper for required config values and development fallback validation.
- Create `packages/server/src/config/security-config.spec.ts`: unit tests for required config behavior.
- Modify JWT consumers in server modules/services/guards to use `getRequiredConfig`.
- Modify `README.md`, `CONFIG.md`, and `CLAUDE.md`: mark local defaults as development-only and remove production-looking secrets from examples.

## Task 1: Environment and compose remediation

- [ ] Replace hardcoded compose secrets with environment interpolation.
- [ ] Bind `hermes-dashboard` to `${HERMES_DASHBOARD_HOST:-127.0.0.1}:9119:9119`.
- [ ] Update `packages/server/.env.example` with project-accurate local values and no live API key.

## Task 2: Server required config helper

- [ ] Add `getRequiredConfig(configService, key)` returning a string or throwing `Error('<KEY> environment variable is not set')`.
- [ ] Add `getRequiredJwtSecret(configService)` that calls `getRequiredConfig(configService, 'JWT_SECRET')`.
- [ ] Add Jest tests for present/missing/empty values.

## Task 3: Wire JWT secret validation

- [ ] Update all `JwtModule.registerAsync` factories to use `getRequiredJwtSecret`.
- [ ] Update `AuthService.refreshToken`, `JwtStrategy`, `JwtAuthGuard`, and `GatewayService` direct JWT verification to use the helper.

## Task 4: Documentation cleanup

- [ ] Update docs to say included defaults are local-development only.
- [ ] Remove real-looking Resend examples; use placeholders.
- [ ] Note that any previously committed Resend key must be rotated outside the repo.

## Task 5: Verification

- [ ] Run targeted Jest test for the new helper.
- [ ] Run server test/build if feasible.
- [ ] Run code review and security review agents before final handoff.
