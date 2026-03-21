# Contributing to ERP Copilot

## Getting started

1. Fork the repository and clone your fork.
2. Install dependencies: `npm install`
3. Create a branch: `git checkout -b feat/your-feature`
4. Use [Conventional Commits](https://www.conventionalcommits.org/) where possible: `feat:`, `fix:`, `docs:`, etc.
5. Open a pull request against `main`.

If you publish npm packages from a fork, update `repository`, `bugs`, and `homepage` in the root and workspace `package.json` files to match your fork.

The same GitHub owner/repo string appears in `.github/ISSUE_TEMPLATE/config.yml` (security advisory link) — keep it in sync with your canonical repository URL.

## Requirements

- **Node.js 20+** (matches CI; `engines` in root `package.json`)
- **Docker** (optional) — for local Postgres/Mongo via `docker compose`

## Local development

### Databases

```bash
docker compose up -d
```

- Postgres is exposed on host port **5433** (see `docker-compose.yml`). The default in `.env.example` matches that.
- MongoDB uses host port **27017**.

### Environment

```bash
cp .env.example .env
```

Set at least one AI provider key and database settings. The demo loads `.env` from the **repository root** (`apps/demo` resolves `../../../.env`).

### Demo API

```bash
npm run dev -w @erp-copilot/demo
```

Default URL: `http://localhost:3000` (change with `PORT` in `.env`).

### Seed data (optional)

```bash
npm run seed:pg -w @erp-copilot/demo
# or
npm run seed:mongo -w @erp-copilot/demo
```

### Dashboard UI

```bash
npm run dev -w @erp-copilot/dashboard-ui
```

Configure the UI to use your demo API base URL as required by that package’s dev setup.

## Before you push

```bash
npm run lint
npm run typecheck
npm test
```

CI runs the same checks on pull requests to `main`.

## Code style

ESLint and Prettier run on staged files via Husky + lint-staged. Prefer matching existing patterns in the package you touch.
