# OmniAgent Synergy OS

Send one prompt to GPT-4o, Claude, Gemini, Mistral, DeepSeek, Groq, and more simultaneously — then synthesise their collective intelligence into one superior answer.

## Run & Operate

- **Frontend dev**: `PORT=5000 npm run dev` (port 5000)
- **Backend dev**: `npm run dev:backend` (port 3001)
- **Both together**: `npm run dev:all`
- **Build**: `npm run build`
- **Typecheck**: `npm run typecheck`

Required env vars (all optional — app runs in demo mode without them):
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `MISTRAL_API_KEY`
- `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `PEKPIK_API_KEY`, `XAI_API_KEY`, `KIMI_API_KEY`

## Stack

- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS v4
- **Backend**: Node.js 20 + Express (no database)
- **Routing**: Wouter
- **UI**: Radix UI + shadcn/ui components

## Where things live

- `src/` — React frontend source
- `src/pages/` — page-level components (Home, Chat, Settings, History, Share)
- `src/lib/providers.ts` — AI provider definitions
- `src/lib/synergyEngine.ts` — core multi-model orchestration logic
- `server/index.js` — Express backend (API proxy for all AI providers)
- `vite.config.ts` — Vite config (port 5000, proxies /api/* to backend port 3001)

## Architecture decisions

- Frontend proxies `/api/*` to backend via Vite proxy in dev; backend never exposes API keys to browser
- App works in demo mode (simulated responses) when no API keys are configured
- Anthropic requires backend proxy due to CORS restrictions
- Single Express server handles all AI providers with a unified `/api/proxy` endpoint
- Static build targets GitHub Pages by default (BASE_PATH env var), but serves from `/` in dev

## Product

- Send a prompt to multiple AI models simultaneously
- Synthesize responses into one combined answer
- Chat history stored locally
- Settings page for configuring API keys per provider
- Share conversations

## User preferences

_Populate as you build_

## Gotchas

- Frontend must run on port 5000 for Replit preview (configured via `PORT=5000`)
- Backend runs on port 3001; do not change to avoid proxy conflicts
- `allowedHosts: true` in vite.config.ts is required for Replit's iframe proxy

## Pointers

- [README](./README.md) — full setup guide including provider API key URLs
- [FIXES.md](./FIXES.md) — known fixes and workarounds
