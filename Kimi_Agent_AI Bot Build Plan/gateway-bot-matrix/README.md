# Gateway Bot Matrix

> The "WordPress for AI" — deploy intelligent bots to any page with one click. No code required.

## Overview

Gateway Bot Matrix is a platform that allows you to deploy AI-powered chatbots to any website with a single click. Think of it as WordPress for AI bots — a simple, powerful way to add intelligent assistants to your web pages.

### Key Features

- **One-Click Deploy**: Choose a template, click deploy, and your bot is live
- **Admin Bar**: Floating admin interface that appears on any page with `?edit=true`
- **Bot Library**: Pre-configured templates for Sales, Support, and Onboarding
- **Multi-Model Support**: GPT-4, Claude 3, and Kimi K2 with automatic fallback
- **Embeddable**: Single script tag to add bots to any website
- **Bookmarklet Demo**: Demo on customer sites without any code changes

## Architecture

```
gateway-bot-matrix/
├── apps/
│   ├── dashboard/          # Main dashboard (Vite + React + shadcn/ui)
│   ├── gateway/            # Cloudflare Worker AI proxy
│   └── embed/              # 3KB vanilla JS embed script
├── packages/
│   ├── types/              # Shared TypeScript types
│   └── ui/                 # Shared UI components
└── tooling/
    └── seed-data/          # SQL schema and seed data
```

## Tech Stack

### Frontend
- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Zustand** for state management
- **Lucide React** for icons

### Backend
- **Supabase** (Postgres + Row Level Security + Realtime)
- **Edge Functions** (Deno) for streaming chat
- **pgvector** for document search

### AI Gateway
- **Cloudflare Workers** for unified API
- **Kimi / Claude / GPT-4** with automatic fallback
- **Streaming** support for real-time responses

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- Cloudflare account (for AI gateway)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/gateway-bot-matrix.git
cd gateway-bot-matrix
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp apps/dashboard/.env.example apps/dashboard/.env.local
```

4. Start the development server:
```bash
pnpm dev
```

### Supabase Setup

1. Create a new Supabase project
2. Run the schema SQL in the SQL Editor:
   - Copy contents from `tooling/seed-data/schema.sql`
   - Paste into Supabase SQL Editor and run

3. Get your API keys from Project Settings > API
4. Add to `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Cloudflare Worker Setup

1. Install Wrangler:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Set secrets:
```bash
cd apps/gateway
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put KIMI_API_KEY
```

4. Deploy:
```bash
wrangler deploy
```

## Usage

### Dashboard

The dashboard provides:
- **Bot Library**: Browse and deploy pre-configured bot templates
- **Deployed Bots**: Manage your active bots
- **Bot Wizard**: Create custom bots with 4-step configuration
- **Embed Code**: Get the script tag for your website

### Admin Bar

The admin bar appears on any page when you add `?edit=true` to the URL:

```
https://yoursite.com/page?edit=true
```

Features:
- View active bots on the current page
- Add new bots from the library
- Quick access to bot settings

### Embed Script

Add this single line to your website:

```html
<script src="https://cdn.gateway.ai/embed.js" data-bot-id="your-bot-id" defer></script>
```

### Bookmarklet Demo

For sales demos without code changes:

1. Drag this link to your bookmarks bar:
   ```javascript
   javascript:(()=>fetch('https://staging.gateway.ai/bookmarklet.js').then(r=>r.text()).then(eval))();
   ```

2. Visit any customer page
3. Click the bookmarklet
4. Admin bar appears — add bots instantly

## Bot Templates

### Sales Assistant
- **Purpose**: Convert visitors into customers
- **Model**: GPT-4
- **Tools**: Web Search, API Calls
- **Color**: Emerald (#10b981)

### Support Agent
- **Purpose**: Technical support and troubleshooting
- **Model**: Claude 3
- **Tools**: Web Search, File Upload, API Calls
- **Color**: Blue (#3b82f6)

### Onboarding Guide
- **Purpose**: Walk new users through product features
- **Model**: Kimi K2
- **Tools**: File Upload, Code Interpreter
- **Color**: Violet (#8b5cf6)

### Blank Canvas
- **Purpose**: Custom bot from scratch
- **Model**: GPT-4
- **Tools**: None (add as needed)
- **Color**: Gray (#6b7280)

## API Endpoints

### Chat
```http
POST /v1/chat
Content-Type: application/json

{
  "botId": "uuid",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "stream": false
}
```

### Get Bot Config (Public)
```http
GET /page_bots/{botId}/public
```

### Health Check
```http
GET /health
```

## Environment Variables

### Dashboard
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GATEWAY_URL=
```

### Gateway Worker
```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
KIMI_API_KEY=
```

## Development

### Project Structure

```
apps/dashboard/src/
├── components/ui/      # shadcn/ui components
├── data/               # Mock data and templates
├── hooks/              # Custom React hooks
├── types/              # TypeScript types
├── App.tsx             # Main application
└── main.tsx            # Entry point
```

### Adding a New Bot Template

1. Edit `src/data/templates.ts`
2. Add template object with:
   - `id`: Unique identifier
   - `name`: Display name
   - `description`: Short description
   - `category`: sales | support | onboarding | custom
   - `default_system_prompt`: AI behavior instructions
   - `default_model`: openai | anthropic | kimi
   - `default_tools`: Tool configuration
   - `default_ui_config`: UI settings
   - `icon`: Lucide icon name

### Customizing the UI

The dashboard uses Tailwind CSS and shadcn/ui. Customize:

- `tailwind.config.js` - Theme colors, fonts, spacing
- `src/index.css` - Global styles and CSS variables
- `src/App.css` - Component-specific styles

## Deployment

### Dashboard (Vercel/Netlify)

1. Build:
```bash
cd apps/dashboard
npm run build
```

2. Deploy `dist/` folder to your hosting provider

### Gateway Worker

```bash
cd apps/gateway
wrangler deploy
```

### Embed Script

Upload `public/embed.js` to your CDN:
```bash
# Example: AWS S3 + CloudFront
aws s3 cp public/embed.js s3://your-cdn-bucket/embed.js
```

## Roadmap

### Phase 1 (MVP)
- [x] Dashboard with bot library
- [x] One-click deploy
- [x] Admin bar with drawer
- [x] Embed script
- [x] AI gateway with fallback

### Phase 2
- [ ] Bot wizard UI
- [ ] Version snapshots
- [ ] Analytics dashboard
- [ ] Multi-language support

### Phase 3
- [ ] Document upload (RAG)
- [ ] Vector search
- [ ] Voice interface
- [ ] Custom tools

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Documentation: [docs.gateway.ai](https://docs.gateway.ai)
- Issues: [GitHub Issues](https://github.com/your-org/gateway-bot-matrix/issues)
- Discord: [Join our community](https://discord.gg/gateway)

---

Built with ❤️ by the Gateway Team
