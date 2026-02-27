import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Code2, User, Building2, Zap, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UpsellData } from "@/types/voice";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isUpsell?: boolean;
  upsellData?: UpsellData;
}

// ─── Upsell product catalog ────────────────────────────────────────────────────

const UPSELL_CATALOG: Record<string, Omit<UpsellData, "functionCallId">> = {
  workspace: {
    productName: "Google Workspace Setup",
    price: 99,
    pitch: "Professional email, Drive, Meet & Calendar — fully configured for your business.",
    ctaRoute: "/compliance-gateway",
  },
  a2p: {
    productName: "A2P 10DLC Registration",
    price: 49,
    pitch: "Register your SMS brand & campaign to avoid carrier filtering and maximize deliverability.",
    ctaRoute: "/compliance-gateway",
  },
};

// ─── Upsell Card ────────────────────────────────────────────────────────────────

function UpsellCard({ data, effectiveColor }: { data: UpsellData; effectiveColor: string }) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleCta = () => {
    if (isDone || isInstalling) return;
    setIsInstalling(true);
    // Simulated async install state — replace with real Stripe/onboarding flow
    setTimeout(() => {
      setIsInstalling(false);
      setIsDone(true);
    }, 2000);
  };

  return (
    <div
      className="rounded-2xl border border-indigo-400/30 bg-indigo-950/60 backdrop-blur-sm p-4 max-w-[85%]"
      data-testid="card-upsell"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shrink-0 mt-0.5">
          <Zap className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{data.productName}</p>
            <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
              ${data.price}
            </span>
          </div>
          {data.pitch && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{data.pitch}</p>
          )}
          <Button
            size="sm"
            onClick={handleCta}
            disabled={isInstalling || isDone}
            className="mt-3 h-8 text-xs font-medium"
            style={{ background: isDone ? "#10b981" : effectiveColor }}
            data-testid="button-upsell-cta"
          >
            {isDone ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Added — we'll follow up!
              </>
            ) : isInstalling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Get Started — ${data.price}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export type ChatInterfaceMode = "customer" | "owner" | "developer";

interface StandardizedChatInterfaceProps {
  mode?: ChatInterfaceMode;
  siteConfigId?: string;
  botName?: string;
  greetingMessage?: string;
  placeholderText?: string;
  primaryColor?: string;
  allowModeSwitch?: boolean;
  onModeChange?: (mode: ChatInterfaceMode) => void;
  fullscreen?: boolean;
}

const MODE_CONFIG = {
  customer: {
    icon: User,
    label: "Customer Chat",
    description: "Discuss business and interact",
    greeting: "Hi! How can I help you today?",
    placeholder: "Ask me anything...",
    color: "#6366f1", // indigo
  },
  owner: {
    icon: Building2,
    label: "Business Owner",
    description: "Manage settings, customers, and projects",
    greeting: "Welcome! Manage your business settings, customers, appointments, and view reports.",
    placeholder: "What would you like to manage?",
    color: "#8b5cf6", // purple
  },
  developer: {
    icon: Code2,
    label: "Developer",
    description: "Technical management and deployment",
    greeting: "Developer Interface: Manage technical aspects, create pages/apps, and deploy agents.",
    placeholder: "Enter development command...",
    color: "#10b981", // green
  },
};

export default function StandardizedChatInterface({
  mode = "customer",
  siteConfigId,
  botName = "AI Biz Bot",
  greetingMessage,
  placeholderText,
  primaryColor,
  allowModeSwitch = false,
  onModeChange,
  fullscreen = false,
}: StandardizedChatInterfaceProps) {
  const [currentMode, setCurrentMode] = useState<ChatInterfaceMode>(mode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorId = useRef(`visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const modeConfig = MODE_CONFIG[currentMode];
  const effectiveGreeting = greetingMessage || modeConfig.greeting;
  const effectivePlaceholder = placeholderText || modeConfig.placeholder;
  const effectiveColor = primaryColor || modeConfig.color;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [currentMode]);

  const handleModeChange = (newMode: ChatInterfaceMode) => {
    setCurrentMode(newMode);
    setMessages([]); // Clear messages when switching modes
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { 
      role: "user", 
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/website-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          siteConfigId: siteConfigId || "platform-landing",
          visitorId: visitorId.current,
          history: messages.slice(-10),
          mode: currentMode,
        }),
      });
      const data = await res.json();

      // ── Upsell intercept: model function call "suggestIntegration" ──────────
      // The server may include { functionCall: { name: "suggestIntegration",
      //   args: { product: "workspace" | "a2p" }, callId: string } } alongside
      // or instead of a plain text response.
      if (data.functionCall?.name === "suggestIntegration") {
        const { product, callId } = data.functionCall.args ?? {};
        const catalog = UPSELL_CATALOG[product];
        if (catalog) {
          const upsellMsg: ChatMessage = {
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isUpsell: true,
            upsellData: { ...catalog, functionCallId: callId ?? `upsell-${Date.now()}` },
          };
          setMessages((prev) => [...prev, upsellMsg]);
          setIsLoading(false);
          return;
        }
      }

      // ── Keyword fallback: detect upsell triggers in plain text responses ───
      const responseText = data.response || "";
      const workspaceKeywords = /google workspace|g suite|business email/i;
      const a2pKeywords = /a2p|10dlc|sms registration|sms compliance/i;

      if (workspaceKeywords.test(responseText) && currentMode === "owner") {
        const upsellMsg: ChatMessage = {
          role: "assistant",
          content: responseText,
          timestamp: new Date(),
          isUpsell: true,
          upsellData: {
            ...UPSELL_CATALOG.workspace,
            functionCallId: `upsell-kw-${Date.now()}`,
          },
        };
        setMessages((prev) => [...prev, upsellMsg]);
        setIsLoading(false);
        return;
      }

      if (a2pKeywords.test(responseText) && currentMode === "owner") {
        const upsellMsg: ChatMessage = {
          role: "assistant",
          content: responseText,
          timestamp: new Date(),
          isUpsell: true,
          upsellData: {
            ...UPSELL_CATALOG.a2p,
            functionCallId: `upsell-kw-${Date.now()}`,
          },
        };
        setMessages((prev) => [...prev, upsellMsg]);
        setIsLoading(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: responseText || "Sorry, I could not respond.",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const ModeIcon = modeConfig.icon;

  return (
    <div 
      className={`flex flex-col bg-slate-900 border border-slate-700 ${fullscreen ? 'h-screen' : 'h-full'}`}
      data-testid="standardized-chat-interface"
      style={{
        maxWidth: fullscreen ? '100%' : 'min(600px, 100vw)',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 flex-shrink-0" 
        style={{ background: effectiveColor }}
      >
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
          <ModeIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{botName}</p>
          <p className="text-white/70 text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {modeConfig.label}
          </p>
        </div>
        {allowModeSwitch && (
          <Select value={currentMode} onValueChange={(value) => handleModeChange(value as ChatInterfaceMode)}>
            <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  <span>Customer</span>
                </div>
              </SelectItem>
              <SelectItem value="owner">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3" />
                  <span>Owner</span>
                </div>
              </SelectItem>
              <SelectItem value="developer">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3 h-3" />
                  <span>Developer</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Messages Area - Takes remaining space */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="bg-slate-800 rounded-xl rounded-bl-sm px-3 py-2.5 text-sm text-slate-300 max-w-[85%]" data-testid="text-greeting">
            {effectiveGreeting}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.isUpsell && msg.upsellData ? (
              <div className="flex flex-col gap-2 max-w-[90%]">
                {msg.content && (
                  <div
                    className="px-3 py-2.5 rounded-xl text-sm bg-slate-800 text-slate-300 rounded-bl-sm whitespace-pre-wrap"
                    data-testid={`text-chat-message-${i}`}
                  >
                    {msg.content}
                  </div>
                )}
                <UpsellCard data={msg.upsellData} effectiveColor={effectiveColor} />
              </div>
            ) : (
              <div
                className={`px-3 py-2.5 rounded-xl text-sm max-w-[85%] whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "rounded-br-sm text-white"
                    : "bg-slate-800 text-slate-300 rounded-bl-sm"
                }`}
                style={msg.role === "user" ? { background: effectiveColor } : undefined}
                data-testid={`text-chat-message-${i}`}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={effectivePlaceholder}
          className="flex-1 bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 border border-slate-700 outline-none focus:border-indigo-500 placeholder:text-slate-500"
          disabled={isLoading}
          data-testid="input-chat-message"
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{ background: effectiveColor }}
          data-testid="button-send-chat"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </Button>
      </div>
    </div>
  );
}
