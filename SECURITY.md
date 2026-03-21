# Security policy

## Supported versions

| Version | Supported                                            |
| ------- | ---------------------------------------------------- |
| `0.0.x` | Best effort (pre-1.0); security fixes land on `main` |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for undisclosed security problems.

Instead, email or open a **private security advisory** for this repository (GitHub → Security → Advisories), including:

- Description of the issue and impact
- Steps to reproduce (if possible)
- Affected component (`ai-core`, connector, demo API, etc.)

We aim to acknowledge reports within a few business days.

## Deployment expectations

ERP Copilot turns **natural language into database queries** via an LLM. Treat it like running **user-influenced SQL/MQL** against your data:

- Use a **read-only database role** for the connector whenever possible.
- **Do not** expose the demo server (`apps/demo`) to the public internet without authentication, rate limiting, and hardening — it is a reference integration.
- The library applies **read-only heuristics** (e.g. `SELECT` / `WITH` for PostgreSQL; constrained shapes for MongoDB). These reduce risk but are **not a substitute** for database permissions, network isolation, and review of what you connect.

If you find a bypass of the read-only checks, report it as a vulnerability.

## Secrets

Never commit API keys or connection strings. Use `.env` locally (see `.env.example`) and your platform’s secret store in production.
