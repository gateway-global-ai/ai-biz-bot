import { type ReactNode, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, LayoutGrid, Search } from "lucide-react";
import { SHELL } from "@/config/brand";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface UIKitNavItem {
  id: string;
  label: string;
}

interface UIKitLayoutProps {
  title: string;
  subtitle?: string;
  navItems: UIKitNavItem[];
  children: ReactNode;
}

export function UIKitLayout({ title, subtitle, navItems, children }: UIKitLayoutProps) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return navItems;
    return navItems.filter((i) => i.label.toLowerCase().includes(s) || i.id.includes(s));
  }, [navItems, q]);

  return (
    <div className="min-h-full flex flex-col md:flex-row" style={{ backgroundColor: SHELL.bg }}>
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-white/10 p-4 md:sticky md:top-0 md:h-[calc(100vh-3.5rem)] md:overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="h-5 w-5 text-emerald-400" />
          <span className="font-semibold text-white text-sm">ClearVoice UI</span>
        </div>
        <Link href="/developer">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" />
            Developer hub
          </span>
        </Link>
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="h-8 pl-8 text-xs bg-slate-900/80 border-slate-700 text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <nav className="space-y-0.5">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "block rounded-md px-2 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle ? <p className="text-slate-400 mt-2 max-w-2xl text-sm">{subtitle}</p> : null}
        </header>
        <div className="space-y-12 max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
