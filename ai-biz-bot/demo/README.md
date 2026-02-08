# AI Biz Bot Demo

This folder is the **demo landing page** for the AI Biz Bot (Chat & Voice + Website Builder).

## Quick start

1. **Chat & Voice interface** (port 3000)
   ```bash
   cd ai-biz-bot/ai-voice-sdk-v1
   cp .env.example .env.local
   # Edit .env.local and set GEMINI_API_KEY (get one at https://aistudio.google.com/apikey)
   npm install && npm run dev
   ```
   Open **http://localhost:3000** in your browser.

2. **Website Builder** (port 3001)
   ```bash
   cd ai-biz-bot/website-builder
   npm install && npm run dev
   ```
   Open **http://localhost:3001** in your browser.

3. **This landing page**  
   Open `demo/index.html` in your browser (or run `npx serve . -p 5173` in this folder and go to http://localhost:5173) to see links to both demos and run instructions.

## What you’ll see

- **Chat & Voice:** Tabs for Voice setup, Identity (company, default mode, hero image), and **Visualizer** (Chat | PTT | Realtime with shared history, branded background, PTT footer).
- **Website Builder:** Google Places–driven site generator with hero, info grid, and voice/concierge options.
