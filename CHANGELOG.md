# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches `1.0.0`.

## [Unreleased]

### Added

- Dockerfile for the demo app (`apps/demo/Dockerfile`)
- `.editorconfig` for consistent formatting across editors
- `.dockerignore` to prevent secrets leaking into Docker images
- `VITE_API_BASE_URL` env variable for dashboard-ui (replaces hardcoded localhost URL)
- README badges for CI status, license, and Node.js version
- CI runs workspace test suites (`npm test`).
- `examples/` with copy-paste snippets.
- `SECURITY.md` and expanded `CONTRIBUTING.md`.
- GitHub issue templates for bugs and features.
- npm-oriented metadata (`repository`, `files`, `exports`) on publishable packages.
- Cross-platform `clean` scripts via `scripts/rm-dist.mjs`.

### Changed

- Removed dead commented-out code from all 4 LLM provider files
- Unified vitest version across all packages (`^4.1.0`)
- Expanded `.gitignore` to cover coverage, IDE files, OS files, and logs
- README aligned with actual layout (demo API, `packages/dashboard-ui`, no `apps/api`).
- `.env.example` Postgres port documented for Docker Compose (`5433` on host).

### Fixed

- `exactOptionalPropertyTypes` error in `apps/erp-copilot.config.ts`

### Security

- Removed exposed API key from `.env` (replaced with placeholder)

### Removed

- Stale `apps/api` entries from `package-lock.json` (workspace folder was not present).
