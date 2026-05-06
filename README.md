# OmniAgent Synergy OS

**Not one model. All of them. Simultaneously.**

A next-generation AI command center that sends every prompt to multiple AI models in parallel - GPT-4o, Claude, Gemini, Mistral, DeepSeek, and Groq - then synthesizes their collective intelligence into one superior answer.

---

## What Makes This Different

Traditional AI apps let you pick one model. OmniAgent Synergy runs them **all at once**:

1. You send a message
2. All enabled models receive it simultaneously
3. You watch each model respond in real time
4. A synthesis pass combines the best of every response into one unified answer
5. You keep full access to every individual model's perspective

---

## Features

- **Parallel Multi-Model Processing** - All enabled models answer simultaneously via parallel API calls
- **Synthesis Engine** - A meta-prompt combines all responses into one superior, unified answer
- **Live Response Feed** - See each model respond with real-time status indicators
- **6 AI Providers** - OpenAI, Anthropic, Google Gemini, Mistral, DeepSeek, Groq
- **Demo Mode** - Works without API keys (simulated responses) so the UI is never empty
- **Local Storage** - API keys and conversations stored in your browser only. No server, no tracking
- **Dark / Light Mode** - Premium dark-first design, togglable
- **GitHub Pages Ready** - Pure frontend, deploy anywhere as a static site

---

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4 + shadcn/ui
- Framer Motion (animations)
- Wouter (routing)
- No backend required

---

## Deploy to GitHub Pages

### Build locally

```bash
npm install
npm run build
```

The production files are generated in `dist/`.

### Deploy to GitHub Pages

This repository now includes a GitHub Actions workflow that:

1. installs dependencies with `npm install`
2. builds the app with the correct GitHub Pages base path
3. deploys the `dist/` folder to Pages

Just enable **GitHub Pages -> Build and deployment -> GitHub Actions** in the repository settings.

### Deploy elsewhere

- Build command: `npm run build`
- Publish directory: `dist`

---

## Configuration

No configuration file needed. On first load:

1. Navigate to **Settings**
2. Enter API keys for the providers you want to use
3. Toggle providers on/off
4. Choose a Synergy Mode (Quality / Balanced / Speed)

All settings are saved to `localStorage` in your browser.

### Supported Providers

| Provider | API Key Source |
|----------|---------------|
| OpenAI | platform.openai.com/api-keys |
| Anthropic | console.anthropic.com | 
| Google Gemini | aistudio.google.com/app/apikey |
| Mistral | console.mistral.ai |
| DeepSeek | platform.deepseek.com |
| Groq | console.groq.com/keys |

> **Note:** Anthropic's API blocks direct browser requests due to CORS. A local proxy server is needed for Anthropic. All other providers work directly from the browser.

---

## Synergy Modes

| Mode | Description |
|------|-------------|
| Quality | All enabled models, maximum context. Best results. |
| Balanced | Top 4 models by reliability. Good balance. |
| Speed | Fastest 3 models. Prioritize latency. |

---

## Privacy

- API keys are stored exclusively in your browser's `localStorage`
- No data is ever sent to any server operated by this app
- All AI requests go directly from your browser to the respective provider's API
- Conversations are stored locally only - clear localStorage to erase everything

---

## License

MIT - free to use, modify, and distribute.
