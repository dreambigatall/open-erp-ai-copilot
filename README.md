# ERP Copilot

> Open-source AI dashboard & copilot framework for ERP systems.
> Plug in your MongoDB or PostgreSQL database and get natural
> language queries, auto-generated dashboards, and an AI assistant
> — in minutes, not months.

## Architecture

```
Your DB (MongoDB / PostgreSQL)
  → Connector layer  (schema discovery + query execution)
  → AI core          (Claude API: NL → SQL/MQL → results)
  → Dashboard UI     (React widgets + copilot chat panel)
```

## Packages

| Package | Description |
|---|---|
| `@erp-copilot/connector-mongo` | MongoDB adapter |
| `@erp-copilot/connector-pg` | PostgreSQL adapter |
| `@erp-copilot/ai-core` | Claude API NL-to-query engine |
| `@erp-copilot/dashboard-ui` | React dashboard + copilot UI |

## Quickstart

```bash
git clone https://github.com/YOUR_ORG/erp-copilot.git
cd erp-copilot
npm install
cp apps/demo/.env.example apps/demo/.env
# Fill in DB connection + ANTHROPIC_API_KEY
docker compose up
npm run dev
```

## Contributing
See CONTRIBUTING.md — PRs welcome.

## License
MIT © 2026
