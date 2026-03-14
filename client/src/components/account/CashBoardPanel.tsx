/**
 * Cash Board — conversation events (actionable routes) for a site.
 * Shows summary counts by event type and recent events list.
 */
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Loader2, DollarSign, MapPin, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const EVENT_LABELS: Record<string, { label: string; icon: typeof BarChart3 }> = {
  pricing: { label: "Pricing / booking", icon: DollarSign },
  reviews: { label: "Reviews", icon: MessageSquare },
  business_details: { label: "Hours / location / website", icon: MapPin },
  knowledge_query: { label: "Knowledge library", icon: MessageSquare },
};

function getEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType]?.label ?? eventType;
}

function getEventIcon(eventType: string) {
  return EVENT_LABELS[eventType]?.icon ?? BarChart3;
}

interface CashBoardPanelProps {
  siteConfigId: string;
}

export function CashBoardPanel({ siteConfigId }: CashBoardPanelProps) {
  const { data: summary, isLoading: summaryLoading } = useQuery<{ byEventType: { eventType: string; count: number }[] }>({
    queryKey: ["/api/site-configs", siteConfigId, "conversation-events", "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/site-configs/${siteConfigId}/conversation-events/summary`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!siteConfigId,
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery<{ events: { id: number; eventType: string; occurredAt: string; callSid: string | null; sessionId: string | null }[]; total: number }>({
    queryKey: ["/api/site-configs", siteConfigId, "conversation-events", 1, 20],
    queryFn: async () => {
      const res = await fetch(`/api/site-configs/${siteConfigId}/conversation-events?page=1&limit=20`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!siteConfigId,
  });

  const isLoading = summaryLoading || eventsLoading;
  const byEventType = summary?.byEventType ?? [];
  const events = eventsData?.events ?? [];
  const total = eventsData?.total ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl"
    >
      <h2 className="font-bold text-white text-lg mb-2 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-400" /> Cash Board
      </h2>
      <p className="text-slate-400 text-sm mb-6">
        Actionable data from voice and chat: what customers asked for. Use this to prioritize updates and spot upsell opportunities.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {byEventType.length === 0 ? (
              <div className="rounded-sui border border-indigo-500/20 bg-slate-800/50 p-4 text-slate-300 text-sm col-span-full">
                No conversation events yet. Events are logged when customers ask about pricing, hours, location, website, or reviews during voice or chat.
              </div>
            ) : (
              byEventType.map(({ eventType, count }) => {
                const Icon = getEventIcon(eventType);
                return (
                  <div
                    key={eventType}
                    className="rounded-sui border border-indigo-500/20 bg-slate-800/30 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-slate-300 text-sm font-medium truncate">{getEventLabel(eventType)}</span>
                    </div>
                    <span className="font-mono font-bold text-white text-lg shrink-0">{count}</span>
                  </div>
                );
              })
            )}
          </div>

          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recent events {total > 0 && `(${total} total)`}
          </h3>
          <div className="rounded-sui border border-indigo-500/20 bg-slate-800/30 overflow-hidden">
            {events.length === 0 ? (
              <div className="p-6 text-center text-slate-300 text-sm">No events to show.</div>
            ) : (
              <ul className="divide-y divide-slate-700/50">
                {events.map((ev) => (
                  <li key={ev.id} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-300">{getEventLabel(ev.eventType)}</span>
                    <span className="text-slate-400 font-mono text-xs">
                      {format(new Date(ev.occurredAt), "MMM d, h:mm a")}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {ev.callSid ? "Phone" : "Web"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
