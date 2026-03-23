/**
 * Platform Knowledge Library — private docs (Cloudbeds, hospitality, platform, Clear Voice).
 * Requires admin auth. Also: Knowledge Base agent chat to search and ask questions.
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Loader2, FileText, FolderOpen, MessageCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";

interface LibraryItem {
  id: string;
  title: string;
  category?: string;
  tags?: string[];
  library_path?: string;
  file_type?: string;
  topic?: string[];
  integration_stage?: string;
  best_practice_flags?: string[];
}

interface PlatformLibraryResponse {
  taxonomy: string[];
  items: LibraryItem[];
}

const TOKEN_KEY = "gateway_auth_token";

export function PlatformKnowledgeLanding() {
  const [search, setSearch] = useState("");
  const { token } = useAuth();
  const authToken = token ?? (typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);

  const { data, isLoading, isError } = useQuery<PlatformLibraryResponse>({
    queryKey: ["/api/knowledge/platform-library", authToken ?? ""],
    queryFn: async () => {
      const t = authToken ?? (typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);
      const res = await fetch("/api/knowledge/platform-library", {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in to view the private library" : "Failed to load library");
      return res.json();
    },
    enabled: !!authToken,
  });

  const items = data?.items ?? [];
  const [kbOpen, setKbOpen] = useState(false);
  const [kbMessages, setKbMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [kbInput, setKbInput] = useState("");
  const kbEndRef = useRef<HTMLDivElement>(null);

  const kbChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const t = authToken ?? (typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);
      const res = await fetch("/api/knowledge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({ message, history: kbMessages }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in to use the Knowledge Base agent" : "Chat failed");
      return res.json() as Promise<{ response: string }>;
    },
    onSuccess: (data, message) => {
      setKbMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: data.response ?? "" },
      ]);
      setKbInput("");
    },
  });

  useEffect(() => {
    kbEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [kbMessages]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.library_path?.toLowerCase().includes(q) ||
        (Array.isArray(item.tags) && item.tags.some((t) => String(t).toLowerCase().includes(q))) ||
        (Array.isArray(item.topic) && item.topic.some((t) => String(t).toLowerCase().includes(q)))
    );
  }, [items, search]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-indigo-500/30">
          <BookOpen className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Platform Knowledge Library</h1>
          <p className="text-slate-400 text-sm">
            Private docs: Cloudbeds, hospitality, platform economics, Clear Voice. Sign in to view. Public library is separate.
          </p>
        </div>
      </motion.div>

      {!authToken && (
        <p className="text-amber-400/90 text-sm rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          Sign in to view the private library and use the Knowledge Base agent.
        </p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.03 }}
      >
        <Card className="rounded-sui border border-slate-700/80 bg-slate-900/60 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-white text-base">Documents ({items.length})</CardTitle>
              <Input
                type="text"
                placeholder="Search by title, category, path, tags…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs h-9 rounded-lg bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-400 py-12">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading knowledge library…</span>
              </div>
            ) : isError ? (
              <p className="text-slate-400 py-8">
                {authToken ? "Failed to load library. The index may not be available in this environment." : "Sign in to view the private library."}
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-slate-400 py-8">
                {items.length === 0 ? "No documents in the platform library." : "No documents match your search."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/80">
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider w-10"> </th>
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">Title</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">Category</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">Path</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wider">Topics / Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-2">
                          {item.file_type === "yaml" ? (
                            <FolderOpen className="w-4 h-4 text-amber-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-400" />
                          )}
                        </td>
                        <td className="py-3 px-2 font-medium text-white">{item.title ?? item.id}</td>
                        <td className="py-3 px-2 text-slate-300">{item.category ?? "—"}</td>
                        <td className="py-3 px-2 font-mono text-xs text-slate-400 truncate max-w-[200px]" title={item.library_path}>
                          {item.library_path ?? "—"}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            {(item.topic ?? []).slice(0, 3).map((t) => (
                              <span
                                key={String(t)}
                                className="px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-300 text-[10px]"
                              >
                                {String(t)}
                              </span>
                            ))}
                            {(item.tags ?? []).slice(0, 2).map((t) => (
                              <span
                                key={String(t)}
                                className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]"
                              >
                                {String(t)}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!isLoading && !isError && items.length > 0 && (
              <p className="text-slate-500 text-xs mt-4">
                {filtered.length === items.length
                  ? `${items.length} document(s)`
                  : `${filtered.length} of ${items.length} shown`}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.06 }}
      >
        <Card className="rounded-sui border border-slate-700/80 bg-slate-900/60 shadow-lg">
          <CardHeader className="pb-3">
            <button
              type="button"
              onClick={() => setKbOpen((o) => !o)}
              className="flex items-center gap-3 text-left w-full"
            >
              <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                <MessageCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-white text-base">Knowledge Base Agent</CardTitle>
                <p className="text-slate-400 text-xs">Ask questions; answers are searched from the private docs above.</p>
              </div>
            </button>
          </CardHeader>
          {kbOpen && (
            <CardContent className="pt-0 space-y-3">
              <div className="rounded-lg bg-slate-950/80 border border-slate-700/60 min-h-[200px] max-h-[320px] overflow-y-auto p-3 flex flex-col gap-2">
                {kbMessages.length === 0 && (
                  <p className="text-slate-500 text-sm">Ask anything about platform docs, Cloudbeds, hospitality, or Clear Voice rules.</p>
                )}
                {kbMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${m.role === "user" ? "ml-auto bg-indigo-500/20 text-white" : "bg-slate-800/60 text-slate-200"}`}
                  >
                    {m.content}
                  </div>
                ))}
                {kbChatMutation.isPending && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching docs…
                  </div>
                )}
                <div ref={kbEndRef} />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. How does Cloudbeds OAuth work?"
                  value={kbInput}
                  onChange={(e) => setKbInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (kbInput.trim() && !kbChatMutation.isPending) kbChatMutation.mutate(kbInput.trim());
                    }
                  }}
                  className="flex-1 rounded-lg bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                />
                <Button
                  size="icon"
                  onClick={() => {
                    if (kbInput.trim() && !kbChatMutation.isPending) kbChatMutation.mutate(kbInput.trim());
                  }}
                  disabled={!kbInput.trim() || kbChatMutation.isPending}
                  className="rounded-lg bg-indigo-500 hover:bg-indigo-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
