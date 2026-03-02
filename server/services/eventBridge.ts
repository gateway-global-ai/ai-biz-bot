/**
 * Real-Time Event Bridge
 *
 * Broadcasts live transcript and telemetry events from the Gemini proxy to
 * dashboard clients via Socket.io rooms. Each business (siteConfigId) has
 * a room so owners only receive their AI's activity.
 */

import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export type NavigatorEventType = "TRANSCRIPT_PARTIAL" | "TRANSCRIPT_FINAL" | "ENERGY_BURN" | "ENERGY_REFILL_SUCCESS";

export interface NavigatorEventPayload {
  type: NavigatorEventType;
  data: {
    text?: string;
    speaker?: "navigator" | "user";
    timestamp?: string;
    [key: string]: unknown;
  };
}

export function initEventBridge(socketIoInstance: SocketIOServer): void {
  io = socketIoInstance;

  io.on("connection", (socket) => {
    socket.on("join_room", (room: string) => {
      if (typeof room === "string" && room.startsWith("business_")) {
        socket.join(room);
      }
    });
  });
}

export function broadcastLiveEvent(siteId: string, payload: NavigatorEventPayload): void {
  if (!io) return;
  const room = `business_${siteId}`;
  io.to(room).emit("navigator_event", payload);
}
