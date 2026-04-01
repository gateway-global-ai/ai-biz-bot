import { type ReactNode } from "react";
import { CANVAS } from "@/config/brand";
import { CodeBlock } from "./CodeBlock";
import { cn } from "@/lib/utils";

interface UIKitSectionProps {
  id: string;
  title: string;
  description?: string;
  preview: ReactNode;
  code: string;
  previewClassName?: string;
}

export function UIKitSection({
  id,
  title,
  description,
  preview,
  code,
  previewClassName,
}: UIKitSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-slate-800/80 pb-12 last:border-0 last:pb-0">
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description ? <p className="text-sm text-slate-400 mb-4 max-w-3xl">{description}</p> : null}
      <div
        className={cn(
          "rounded-sui border border-slate-700/80 p-6 mb-4",
          previewClassName,
        )}
        style={{ backgroundColor: CANVAS.bg }}
      >
        <div className="text-slate-800">{preview}</div>
      </div>
      <CodeBlock code={code} />
    </section>
  );
}
