import { Link } from "wouter";
import { Calendar, User, Bot, Mic, QrCode, FileText, Shield } from "lucide-react";
import { OSMenuList } from "@/components/os/OSMenuList";
import type { OSMenuItem } from "@/hooks/useOSMenu";
import { AgentQRCard } from "@/components/AgentQRCard";
import { BRAND, CANVAS, SHELL } from "@/config/brand";
import { UIKitSection } from "./UIKitSection";
import { CodeBlock } from "./CodeBlock";

const DEMO_OS_ITEMS: OSMenuItem[] = [
  {
    id: "demo-appts",
    label: "Appointments",
    icon: Calendar,
    description: "Book or reschedule",
  },
  {
    id: "demo-account",
    label: "My Account",
    icon: User,
    description: "Profile and preferences",
  },
  {
    id: "demo-support",
    label: "Support",
    icon: Bot,
    description: "AI concierge",
  },
];

/** Static bars mimicking the shell visualizer band (not full audio pipeline). */
function VisualizerDemo() {
  const heights = [40, 65, 35, 80, 50, 70, 45];
  return (
    <div
      className="rounded-lg px-4 py-3 flex items-end justify-center gap-1 h-16"
      style={{ backgroundColor: SHELL.bg }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-2 rounded-sm transition-all"
          style={{
            height: `${h}%`,
            backgroundColor: i % 3 === 0 ? BRAND.green : BRAND.greenLight,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

export function PlatformSdkSections() {
  return (
    <>
      <section
        id="sdk-matrix-doc"
        className="scroll-mt-24 border-b border-slate-800/80 pb-12"
      >
        <h3 className="text-lg font-semibold text-white mb-2">Comprehensive SDK matrix (governance)</h3>
        <p className="text-sm text-slate-400 mb-4 max-w-3xl">
          Full classification (foundation vs wrapped vs vendor vs deprecated), ownership layers, and
          extraction targets for PTT, visualizer, transcripts, QR, onboarding, and SMS compliance lives in{" "}
          <code className="text-emerald-400/90">docs-governance/UI_SDK_MATRIX.md</code>.           The in-app kit shows
          preview slices where wrappers already exist; &quot;Wrap + extract&quot; rows are tracked there until
          components move under <code className="text-emerald-400/90">@/ui/communications</code> and related
          folders.
        </p>
        <CodeBlock
          code={`// Governance (read in repo)
docs-governance/UI_SDK_MATRIX.md
docs-governance/UI_ARCHITECTURE_AUDIT.md
docs-governance/UI_COMPONENT_REGISTRY.md`}
        />
      </section>

      <section
        id="demo-boardwalk-multitask"
        className="scroll-mt-24 border-b border-slate-800/80 pb-12"
      >
        <h3 className="text-lg font-semibold text-white mb-2">Boardwalk multitask demo (hospitality)</h3>
        <p className="text-sm text-slate-400 mb-4 max-w-3xl">
          Flagship single-agent profile: DISC/ARCH, <code className="text-emerald-400/90">SALES</code> mode with
          inventory-capable tools, merged KB (SerpAPI digest, Places facts, clean-room extract). Run with Doppler.
          Policy: <code className="text-emerald-400/90">docs-governance/AGENT_POLICY_REGISTRY.md</code> (Demo —
          Boardwalk). Voice prompt nuance:{" "}
          <code className="text-emerald-400/90">docs-governance/VOICE_BOARDWALK_DEMO_NOTE.md</code>.
        </p>
        <CodeBlock
          code={`npm run demo:boardwalk-agent
# Uses: scripts/demo-agent-boardwalk.ts
# Extraction report: .system_design/extractions/extraction_2026-03-22.md`}
        />
      </section>

      <UIKitSection
        id="canvas-os-menu"
        title="OS menu (OSMenuList)"
        description="Canvas menu grid driven by OSMenuItem[]. Production uses useOSMenu(role, …); this demo uses static items."
        code={`import { OSMenuList } from '@/components/os/OSMenuList';
import type { OSMenuItem } from '@/hooks/useOSMenu';

const items: OSMenuItem[] = [ /* … */ ];

<OSMenuList items={items} onSelect={(item) => {}} columns={2} />`}
        preview={
          <OSMenuList
            items={DEMO_OS_ITEMS}
            columns={2}
            onSelect={() => {}}
          />
        }
      />

      <UIKitSection
        id="communications-visualizer"
        title="Visualizer band (pattern)"
        description="Shell visualizer is owned by ConciergePanel today. Target wrapper: VoiceVisualizerBar @ ui/communications. This demo is static bars only."
        code={`// Target extraction from ConciergePanel → @/ui/communications/VoiceVisualizerBar
// Tokens: BRAND.green / BRAND.greenLight, SHELL.bg`}
        preview={<VisualizerDemo />}
        previewClassName="!p-0 overflow-hidden"
      />

      <UIKitSection
        id="marketplace-qr-card"
        title="QR campaign (AgentQRCard)"
        description="Wrap target: QRCodeCampaignCard. Renders /biz/:slug chat URL."
        code={`import { AgentQRCard } from '@/components/AgentQRCard';

<AgentQRCard
  title="Voice AI"
  slug="demo-slug"
  description="Scan to chat"
/>`}
        preview={
          <div className="max-w-sm mx-auto rounded-sui p-4" style={{ backgroundColor: SHELL.bg }}>
            <AgentQRCard title="UI Kit Demo" slug="demo" description="Example QR destination" />
          </div>
        }
        previewClassName="!p-2"
      />

      <UIKitSection
        id="canvas-typography-lists"
        title="Lists and bullets (canvas)"
        description="Use Tailwind prose or explicit list styles on CANVAS.bg; keep shell lists separate."
        code={`<ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
  <li>Voice-first flows</li>
  <li>OTP and Nova IDV when required</li>
</ul>`}
        preview={
          <ul className="list-disc pl-5 space-y-2 text-slate-700 text-sm max-w-md">
            <li>Shell: dark zones only (SHELL.bg).</li>
            <li>Canvas: white content (CANVAS.bg) for customer-facing menus and chat.</li>
            <li>See APP_SHELL_CONTRACT for PTT footer slots.</li>
          </ul>
        }
      />

      <section id="compliance-links" className="scroll-mt-24 border-b border-slate-800/80 pb-12">
        <h3 className="text-lg font-semibold text-white mb-2">Onboarding, SMS opt-in, compliance</h3>
        <p className="text-sm text-slate-400 mb-4">
          These are routes and flows, not a single component. Link to the running app routes from here.
        </p>
        <div
          className="grid gap-3 sm:grid-cols-2 max-w-3xl"
          style={{ color: CANVAS.text }}
        >
          <Link
            href="/compliance-gateway"
            className="flex items-start gap-3 rounded-sui border border-slate-200 bg-white p-4 text-left hover:border-emerald-500/40 transition-colors"
          >
            <FileText className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-900">Onboarding gateway</div>
              <div className="text-xs text-slate-500">/compliance-gateway — wizard-style compliance entry</div>
            </div>
          </Link>
          <Link
            href="/sms-consent"
            className="flex items-start gap-3 rounded-sui border border-slate-200 bg-white p-4 text-left hover:border-emerald-500/40 transition-colors"
          >
            <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-900">SMS consent (A2P)</div>
              <div className="text-xs text-slate-500">Public legal / opt-in copy</div>
            </div>
          </Link>
          <Link
            href="/chat/owner"
            className="flex items-start gap-3 rounded-sui border border-slate-200 bg-white p-4 text-left hover:border-emerald-500/40 transition-colors"
          >
            <Mic className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-900">Full PTT + Concierge shell</div>
              <div className="text-xs text-slate-500">Canonical voice OS surface (auth as required)</div>
            </div>
          </Link>
          <div className="flex items-start gap-3 rounded-sui border border-dashed border-slate-300 bg-slate-50 p-4 text-left">
            <QrCode className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-600">Extracted VoiceDock</div>
              <div className="text-xs text-slate-500">Planned: @/ui/communications — see UI_SDK_MATRIX.md</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
