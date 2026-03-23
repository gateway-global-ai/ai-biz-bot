import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { UIButton } from "@/ui/foundation";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  className?: string;
}

export function CodeBlock({ code, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={cn("relative rounded-lg border border-slate-700 bg-slate-950/80", className)}>
      <UIButton
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 text-slate-400 hover:text-white"
        onClick={handleCopy}
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </UIButton>
      <pre className="overflow-x-auto p-4 pr-12 text-left text-xs font-mono text-slate-300 leading-relaxed">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}
