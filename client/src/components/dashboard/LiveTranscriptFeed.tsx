/**
 * Live Intelligence Feed — real-time transcript from Gemini voice sessions.
 * Listens for TRANSCRIPT_PARTIAL / TRANSCRIPT_FINAL from the event bridge (Socket.io)
 * and displays them with a pulse indicator when a call is active.
 */

import { useEffect, useState, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MAX_MESSAGES = 50;

interface TranscriptMessage {
  text: string;
  speaker?: string;
  timestamp: string;
}

interface NavigatorEvent {
  type: "TRANSCRIPT_PARTIAL" | "TRANSCRIPT_FINAL" | "ENERGY_BURN";
  data: TranscriptMessage & { turnComplete?: boolean };
}

export interface LiveTranscriptFeedProps {
  siteId: string;
  className?: string;
}

export function LiveTranscriptFeed({ siteId, className }: LiveTranscriptFeedProps) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const liveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!siteId) return;

    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    const room = `business_${siteId}`;
    socket.emit("join_room", room);

    socket.on("navigator_event", (event: NavigatorEvent) => {
      if (event.type === "TRANSCRIPT_PARTIAL" && event.data?.text) {
        setIsLive(true);
        if (liveTimeoutRef.current) {
          clearTimeout(liveTimeoutRef.current);
          liveTimeoutRef.current = null;
        }
        setMessages((prev) =>
          [...prev, { text: event.data.text!, speaker: event.data.speaker ?? "navigator", timestamp: event.data.timestamp ?? new Date().toISOString() }].slice(-MAX_MESSAGES)
        );
      } else if (event.type === "TRANSCRIPT_FINAL") {
        liveTimeoutRef.current = setTimeout(() => setIsLive(false), 3000);
      }
    });

    return () => {
      if (liveTimeoutRef.current) clearTimeout(liveTimeoutRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [siteId]);

  return (
    <Card className={className ?? "bg-[#161b22] border-cyan-500/30"}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-white">
          Live Intelligence Feed
        </CardTitle>
        {isLive && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
            <span className="text-[10px] text-cyan-400 uppercase font-black tracking-wide">
              Call in Progress
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length === 0 && (
          <p className="text-xs text-slate-500">No live activity yet. Transcripts will appear here when the AI is speaking.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.timestamp}-${i}`}
            className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <p className="text-xs font-mono text-slate-400">
              [{m.timestamp.split("T")[1]?.split(".")[0] ?? m.timestamp}]
            </p>
            <p className="text-sm text-cyan-100 font-medium">
              <span className="text-emerald-400">Navigator:</span> {m.text}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
