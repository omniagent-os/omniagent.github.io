# OmniAgent Synergy OS

Send one prompt to **GPT-4o, Claude, Gemini, Mistral, DeepSeek, and Groq** simultaneously — then synthesise their collective intelligence into one superior answer.

---

## Quick start

### 1 — Frontend only (demo mode)
```bash
npm install
npm run dev          # http://localhost:3000
```
Without API keys the app runs in **demo mode** with simulated responses.

---

### 2 — Frontend + Backend (real AI responses)

#### Step A — Configure API keys
```bash
cp server/.env.example server/.env
# Open server/.env and paste your keys
```

Where to get keys (all have free tiers or trials):

| Provider  | URL |
|-----------|-----|
| OpenAI    | https://platform.openai.com/api-keys |
| Anthropic | https://console.anthropic.com/settings/keys |
| Google    | https://aistudio.google.com/app/apikey |
| Mistral   | https://console.mistral.ai/api-keys |
| DeepSeek  | https://platform.deepseek.com/api_keys |
| Groq      | https://console.groq.com/keys |

You only need keys for the providers you want to use — the rest are skipped automatically.

#### Step B — Install backend dependencies
```bash
cd server && npm install && cd ..
```

#### Step C — Run both servers
```bash
npm run dev:all
# Frontend → http://localhost:3000
# Backend  → http://localhost:3001
```

Or run them separately:
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:backend
```

---

## Architecture

```
Browser (React + Vite)
   │
   ├── /api/status  ──→  Backend (Express, Node 20)
   └── /api/proxy   ──→  Backend ──→  OpenAI / Anthropic / Google / Mistral / DeepSeek / Groq
```

- **Frontend** — React 18 + TypeScript + Vite 5 + Tailwind CSS v4
- **Backend** — Node.js 20 + Express, no database needed
- **API keys** — stored only in `server/.env`, never sent to the browser
- **Anthropic** — works correctly via backend (CORS is bypassed server-side)

---

## Deploying

### Frontend → GitHub Pages (static)
```bash
npm run build
# Push the dist/ folder or use the existing GitHub Actions workflow
```

### Backend → Any Node host
Deploy the `server/` folder to Railway, Render, Fly.io, or any VPS.
Set the environment variables from `server/.env.example` in your host's dashboard.
Then set `VITE_API_BASE=https://your-backend.railway.app` in your frontend build.

---

## Models used (latest as of 2025)

| Provider  | Default model                  |
|-----------|-------------------------------|
| OpenAI    | gpt-4o                        |
| Anthropic | claude-3-5-sonnet-20241022    |
| Google    | gemini-2.0-flash              |
| Mistral   | mistral-large-latest          |
| DeepSeek  | deepseek-chat                 |
| Groq      | llama-3.3-70b-versatile       |
