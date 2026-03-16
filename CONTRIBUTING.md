# Contributing to ERP Copilot

## Getting started
1. Fork the repo and clone locally
2. Install deps: `npm install`
3. Create a feature branch: `git checkout -b feat/your-feature`
4. Commit with conventional commits: `feat:`, `fix:`, `docs:`
5. Open a pull request

## Dev setup requirements
- Node.js >= 18
- Docker (for running test DBs)

## Code style
ESLint + Prettier enforced on commit via lint-staged.
Run `npm run lint` before pushing.