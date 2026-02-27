# Codebase Reconnaissance Report (Clean Room Extraction)

**Source archives:** `_legacy_archive/interface_design_review/chat-ai-biz-bot-voice.zip` (Control Room) · `genai-business-site-(chat-sdk).zip` (Showroom)  
**Extraction date:** 2026-02-27  
**Status:** Quarry burned; no files left in agent-accessible paths.

---

## 1. TypeScript Interfaces & Data Schemas

### Control Room (`chat-ai-biz-bot-voice`)

```typescript
enum VoiceName { Puck, Charon, Kore, Fenrir, Zephyr }
enum Language { English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese }
type VisualizerType = 'bars' | 'wave' | 'orb';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'message' | 'tool';
  message: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface AudioConfig {
  voice: string;
  prebuiltVoiceConfig: { voiceName: string };
}

interface LiveConfig {
  temperature: number;
  topP: number;
  topK: number;
}

interface VoiceDetail {
  id: string;
  label: string;
  gender: 'Male' | 'Female';
  description: string;
  technology: VoiceTechnology;
  recommendedFor?: string;
}
```

**Agent identity (inline state):** `{ company: string; position: string; task: string }` — synthesized into system instruction.

### Showroom (`genai-business-site`)

```typescript
interface BusinessData {
  name: string;
  tagline: string;
  description: string;
  address: string;
  rating: number;
  reviewCount: number;
  mapLink: string;
  hours: string[];
  reviews: Review[];
  insights: string[];
  images: string[];
  nearbyRestaurants: NearbyPlace[];
  nearbyActivities: NearbyPlace[];
  rawPlaceData: any;
  types?: string[];
  menu?: MenuSection[];
  categoryType: InventoryType; // 'menu' | 'catalog' | 'services'
}

interface AgentConfig {
  name: string;
  role: string;
  discProfile: string;
  basePrompt: string;
}

interface VoiceConfig {
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  language: string;
  isPushToTalk?: boolean;
}

interface BotConfig {
  botId: string;
  botConfigId: string;
  agentProfile: AgentConfig;
  voiceConfig?: VoiceConfig;
}

interface VoiceQueueItem {
  id: string;
  text: string;
  status: 'pending' | 'sent' | 'error';
  timestamp: number;
}

interface CrmContact {
  id: string;
  name: string;
  email: string;
  status: 'Lead' | 'Customer' | 'VIP';
  lastContact: string;
}

interface SdkTheme {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
}

type ChatMode = 'customer' | 'owner' | 'developer';
type ChatLayoutMode = 'floating' | 'fixed' | 'fullscreen';
type AdminAuthStatus = 'idle' | 'awaiting_otp' | 'authenticated';
```

---

## 2. API & Service Hooks (Documentation Only — No Merge)

- **useLiveApi hook:** `(model, voice, systemInstruction, config: LiveConfig)` → connect/disconnect, volume, logs, chatHistory, isMuted, sendText. Uses `GoogleGenAI`, `ai.live.connect()`, config: `responseModalities: [AUDIO]`, `inputAudioTranscription`, `outputAudioTranscription`, `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`, `generationConfig` (temperature, topP, topK). Input 16 kHz, output 24 kHz.
- **LiveVoiceClient class:** Ref-based; `connect(businessData, agentConfig, voiceName)`; `onVolumeChange`, `onTranscriptionUpdate`; PTT via `setStreaming(true|false)`; `sendText(text)`.
- **audioUtils:** `createBlob(Float32Array)` → PCM 16 kHz blob; `decodeAudioData(bytes, ctx, sampleRate, numChannels)`; encode/decode base64.

Do not merge WebSocket/Live API session logic into active project during extraction.

---

## 3. UI Blueprint (Tailwind Tokens)

### Control Room (Dark “Mixing Board”)

- **Base:** `bg-gray-950 text-gray-100`
- **Cards/panels:** `bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl`
- **Inputs:** `bg-gray-950 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30`
- **Selected voice (male):** `bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]`
- **Selected voice (female):** `bg-pink-500/10 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]`
- **Visualizer bars:** `bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]`
- **Visualizer wave:** `bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]`
- **Visualizer orb:** `bg-cyan-500 shadow-[0_0_40px_rgba(34,211,238,0.6)]`
- **User bubble:** `bg-blue-600 text-white rounded-tr-none`
- **Model bubble:** `bg-gray-800 border border-gray-700 rounded-tl-none`

### Showroom (Sovereign Light)

- **Landing glass:** `bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl`
- **Hero badge:** `bg-white/10 backdrop-blur-xl border border-white/10 rounded-full`
- **Hero CTA primary:** `bg-white text-slate-900 rounded-full`
- **Hero CTA secondary:** `bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-xl border border-white/10`
- **Info cards:** `rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100`
- **Hours card:** `bg-slate-900 text-white rounded-[2rem]`
- **Rating card:** `bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2rem]`
- **Chat widget (floating):** `bottom-24 right-6 w-96 h-[650px] rounded-3xl border border-slate-200 shadow-2xl`
- **Admin overlay:** `bg-slate-900/50 backdrop-blur-sm`
- **Admin drawer:** `bg-white max-w-2xl shadow-2xl`
- **Voice view (embedded dark):** `bg-[#0a0f1c]`, header `bg-[#0d1321]`, cards `bg-[#111827] border border-slate-800 rounded-2xl`

### Large radii

- `rounded-2xl`, `rounded-3xl`, `rounded-[2rem]`, `rounded-[2.5rem]`, `rounded-b-[5rem]` (hero), `rounded-full` (pills/buttons).

---

## 4. Mock Data Inventory

**MOCK_CRM (CrmContact[]):** id, name, email, status (Customer/Lead/VIP), lastContact.

**MOCK_CONTACTS:** name, email, type (Customer/Lead/Partner), lastActive, status (Active/Pending/Inactive).

**MOCK_LEADS:** company, contact, value, stage (Negotiation/Qualified/Discovery), probability.

**MOCK_TASKS:** title, due, priority (High/Medium/Low), type (Sales/Finance/Admin/Marketing).

**MOCK_WORKSPACE_APPS:** id, name, icon, description, status (boolean), color, bg (Tailwind classes) — Gmail, Calendar, Drive, Meet, Chat, Sheets, Docs, Tasks, Google My Business.

**Default BotConfig:** botId, botConfigId, agentProfile (name, role, discProfile, basePrompt), voiceConfig (voiceName: Zephyr, language, isPushToTalk).

**Reports mock KPIs:** Total Revenue $24,500 (↑12%), New Leads 18 (↑4); chart placeholder only.

---

## 5. Security Flags

- **PlaceSearch (Showroom):** Hardcoded Google Maps API key in script URL. Must be replaced with env-based injection (e.g. `process.env.MAPS_JS_KEY` / Vite `define`) — do not carry forward.

---

## 6. Build Notes

- Prefer **useLiveApi**-style hook for platform; ref-based LiveVoiceClient only where shared singleton is required.
- **AgentConfig.discProfile** has no current `site_configs` equivalent — net-new DB field to plan.
- **VoiceQueueItem** / PTT “outgoing queue” UI is a high-value addition for the Showroom chat widget.
- **ChatMode** `owner` → site owner/reseller; `customer` → end-user; `developer` has no current mapping.
- **SdkTheme** (primaryColor, fontFamily, borderRadius) should be persisted in site config for white-label theming.
