import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FloatingChatWidgetProps {
  siteConfigId?: string;
  botName?: string;
  greetingMessage?: string;
  placeholderText?: string;
  primaryColor?: string;
}

export default function FloatingChatWidget({
  siteConfigId,
  botName = "AI Assistant",
  greetingMessage = "Hi! I can help you learn about our AI-powered websites, plans, and features. What would you like to know?",
  placeholderText = "Ask me anything...",
  primaryColor = "#6366f1",
}: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorId = useRef(`visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
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
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "Sorry, I could not respond." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-[9999]">
        <Button
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg shadow-indigo-500/30"
          style={{ background: primaryColor }}
          onClick={() => setIsOpen(true)}
          data-testid="button-open-chat-widget"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[360px] max-w-[calc(100vw-2rem)]" data-testid="chat-widget-container">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden" style={{ maxHeight: "min(520px, calc(100vh - 6rem))" }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700" style={{ background: primaryColor }}>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {botName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{botName}</p>
            <p className="text-white/70 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Online
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-white/80 hover:text-white no-default-hover-elevate"
            onClick={() => setIsOpen(false)}
            data-testid="button-close-chat-widget"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[250px]">
          {messages.length === 0 && (
            <div className="bg-slate-800 rounded-xl rounded-bl-sm px-3 py-2.5 text-sm text-slate-300 max-w-[85%]" data-testid="text-greeting">
              {greetingMessage}
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2.5 rounded-xl text-sm max-w-[85%] whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "rounded-br-sm text-white"
                    : "bg-slate-800 text-slate-300 rounded-bl-sm"
                }`}
                style={msg.role === "user" ? { background: primaryColor } : undefined}
                data-testid={`text-chat-message-${i}`}
              >
                {msg.content}
              </div>
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

        <div className="border-t border-slate-700 px-3 py-2.5 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={placeholderText}
            className="flex-1 bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 border border-slate-700 outline-none focus:border-indigo-500 placeholder:text-slate-500"
            disabled={isLoading}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{ background: primaryColor }}
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
    </div>
  );
}
