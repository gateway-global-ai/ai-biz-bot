/**
 * Unofficial shadcn.io directory — reads /shadcn-io/merged_catalog.v1.json (synced from registry).
 * Design-time reference only; not affiliated with shadcn.io or ui.shadcn.com.
 * See docs-governance/artifacts/SHADCN_IO_COMMUNITY_MIRROR_V1.md
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ExternalLink, Search } from "lucide-react";
import { SHELL, CANVAS } from "@/config/brand";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  category: string;
  slug: string;
  title: string;
  docUrl: string;
  recipeUrl?: string;
  installCommand?: string;
  subcategory?: string;
};

type MergedCatalog = {
  spec: string;
  generatedAt?: string;
  disclaimer?: string;
  entryCount?: number;
  entries: Entry[];
};

const CATEGORIES = ["ai", "button", "hooks", "text", "blocks"] as const;

export default function ShadcnIoCatalogPage() {
  const [data, setData] = useState<MergedCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof CATEGORIES)[number] | "all">("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/shadcn-io/merged_catalog.v1.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: MergedCatalog) => {
        if (!cancelled) setData(j);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load catalog");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data?.entries) return [];
    const q = query.trim().toLowerCase();
    return data.entries.filter((e) => {
      if (tab !== "all" && e.category !== tab) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q) ||
        e.docUrl.toLowerCase().includes(q)
      );
    });
  }, [data, query, tab]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: SHELL.bg }}
    >
      <header
        className="border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: SHELL.bg }}
      >
        <div>
          <h1 className="text-xl font-bold text-white">shadcn.io directory</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Local merged index (components + blocks) for when upstream pages or MCP are
            unavailable. Unofficial — not affiliated with shadcn.io or shadcn/ui.
          </p>
        </div>
        <Link href="/developer">
          <span className="text-sm text-indigo-300 hover:text-indigo-200">
            ← Developer
          </span>
        </Link>
      </header>

      <main
        className="flex-1 p-6 overflow-auto rounded-t-sui border border-slate-700/50"
        style={{ backgroundColor: CANVAS.bg }}
      >
        {error && (
          <p className="text-red-600 text-sm mb-4">
            {error} — Run{" "}
            <code className="bg-slate-100 px-1 rounded">npm run shadcn-io:generate</code>{" "}
            and ensure{" "}
            <code className="bg-slate-100 px-1 rounded">client/public/shadcn-io/</code>{" "}
            is populated.
          </p>
        )}

        {data && (
          <p className="text-xs text-slate-500 mb-4 font-mono">
            {data.spec}
            {data.generatedAt ? ` · ${data.generatedAt}` : ""} · {data.entryCount ?? data.entries.length}{" "}
            entries
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title, id, slug…"
              className="pl-9 rounded-sui border-slate-200"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={tab === "all"} onClick={() => setTab("all")}>
              All
            </FilterChip>
            {CATEGORIES.map((c) => (
              <FilterChip key={c} active={tab === c} onClick={() => setTab(c)}>
                {c}
              </FilterChip>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-sui border border-slate-200 overflow-hidden bg-white shadow-sm"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-slate-800">Title</TableHead>
                <TableHead className="text-slate-800">Id</TableHead>
                <TableHead className="text-slate-800">Doc</TableHead>
                <TableHead className="text-slate-800 w-24">Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-slate-900">{e.title}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{e.id}</TableCell>
                  <TableCell>
                    <a
                      href={e.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-slate-600 capitalize">{e.category}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && !error && (
            <p className="p-8 text-center text-slate-500 text-sm">No rows match.</p>
          )}
        </motion.div>
      </main>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-sui text-sm border transition-colors",
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
      )}
    >
      {children}
    </button>
  );
}
