/**
 * HotelInventoryGrid — Sovereign OS edition.
 * Renders live GRN room inventory in the 40% Content Window.
 * Sovereign overlays: room names, mattress badge, pro tip, staff note. Pinned rooms first.
 * "Book Now" tracks reseller intent then redirects to booking URL.
 *
 * Design: Jason Standard — glass cards, indigo-pulse on pinned/sovereign rooms,
 * framer-motion lift on hover, emerald "1% Insight" badges.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Pin, AlertTriangle, Info, ExternalLink, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InventoryRoom {
  roomType: string;
  netPrice?: number;
  currency: string;
  boardType?: string;
  ratePlanCode?: string;
  sovereignName: string;
  mattressType?: string | null;
  proTip?: string | null;
  staffNote?: string | null;
  pinned?: boolean;
}

interface HotelInventoryData {
  success?: boolean;
  error?: string;
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
  platformId?: string;
  totalAvailable?: number;
  rooms?: InventoryRoom[];
  bookingUrl?: string | null;
}

interface HotelInventoryGridProps {
  data: HotelInventoryData;
  checkIn?: string;
  checkOut?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: "easeOut", delay: i * 0.06 },
  }),
};

function RoomCard({
  room,
  platformId,
  bookingUrl,
  onTrackIntent,
  index,
}: {
  room: InventoryRoom;
  platformId?: string;
  bookingUrl?: string | null;
  onTrackIntent: (payload: { platformId: string; roomType: string; netPrice: number }) => void;
  index: number;
}) {
  const [booking, setBooking] = useState(false);
  const price = room.netPrice ?? 0;
  const isSovereign = !!(room.pinned || room.mattressType || room.proTip);

  const handleBook = async () => {
    if (!platformId) {
      window.open(bookingUrl || "#", "_blank");
      return;
    }
    setBooking(true);
    try {
      await onTrackIntent({ platformId, roomType: room.roomType, netPrice: price });
    } finally {
      setBooking(false);
    }
    window.open(bookingUrl || "#", "_blank");
  };

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.03, y: -3, transition: { type: "spring", stiffness: 320, damping: 22 } }}
      className={[
        "relative flex flex-col rounded-sui overflow-hidden",
        "bg-slate-900/50 backdrop-blur-xl",
        "border shadow-xl transition-shadow duration-300",
        isSovereign
          ? "border-indigo-500/35 animate-sovereign-pulse shadow-indigo-500/10"
          : "border-indigo-500/15 hover:border-indigo-500/30",
      ].join(" ")}
    >
      {/* Sovereign pinned badge */}
      {room.pinned && (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 badge-insight">
          <Pin className="w-2.5 h-2.5" />
          Featured
        </div>
      )}

      {/* "1% Insight" badge for rooms with sovereign data */}
      {isSovereign && !room.pinned && (
        <div className="absolute top-2.5 right-2.5 z-10 badge-insight">1% Insight</div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Name + price row */}
        <div className="flex items-start justify-between gap-2 mt-4">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-sm leading-snug">
              {room.sovereignName || room.roomType}
            </p>
            {room.boardType && (
              <p className="text-[10px] text-slate-500 mt-0.5">{room.boardType}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-0.5 text-emerald-400 font-bold text-base">
              <DollarSign className="w-3.5 h-3.5" />
              {price.toFixed(0)}
            </div>
            <p className="text-[10px] text-slate-500">/ night</p>
          </div>
        </div>

        {/* Mattress — sovereign data chip */}
        {room.mattressType && (
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="data-chip">{room.mattressType}</span>
          </div>
        )}

        {/* Pro tip + staff note */}
        {(room.proTip || room.staffNote) && (
          <div className="flex items-center gap-2 text-slate-400">
            {room.proTip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-400 cursor-help hover:text-indigo-300 transition-colors">
                      <Info className="w-3 h-3" />
                      Pro Tip
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-[200px] bg-slate-900 border-indigo-500/30 text-slate-200"
                  >
                    {room.proTip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {room.staffNote && (
              <p className="text-[10px] text-slate-500 italic line-clamp-1 flex-1">
                {room.staffNote}
              </p>
            )}
          </div>
        )}

        {/* Book Now CTA */}
        <motion.button
          type="button"
          onClick={handleBook}
          disabled={booking}
          whileTap={{ scale: 0.97 }}
          className="mt-auto w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[14px] bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
        >
          {booking ? (
            "Redirecting…"
          ) : (
            <>
              Book Now
              <ExternalLink className="w-3 h-3" />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

export function HotelInventoryGrid({ data, checkIn: propCheckIn, checkOut: propCheckOut }: HotelInventoryGridProps) {
  const checkIn = propCheckIn ?? data.checkIn;
  const checkOut = propCheckOut ?? data.checkOut;
  const rooms = data.rooms ?? [];
  const totalAvailable = data.totalAvailable ?? rooms.length;

  const trackIntent = async (payload: { platformId: string; roomType: string; netPrice: number }) => {
    try {
      await fetch("/api/reseller/track-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Best-effort
    }
  };

  if (data.error || !data.success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-8 gap-3"
      >
        <div className="w-12 h-12 rounded-sui bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        </div>
        <p className="text-sm font-medium text-slate-400">{data.error ?? "Unable to load inventory."}</p>
      </motion.div>
    );
  }

  if (!rooms.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2"
      >
        <p className="text-sm font-medium">No rooms available</p>
        {checkIn && checkOut && (
          <p className="text-xs text-slate-600">for {checkIn} → {checkOut}</p>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-bold text-white">
            {data.hotelName ?? "Live Rates"}
          </p>
          {checkIn && checkOut && (
            <p className="data-chip mt-1 inline-block">{checkIn} → {checkOut}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalAvailable <= 2 && (
            <motion.span
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full"
            >
              <AlertTriangle className="w-3 h-3" />
              Only {totalAvailable} left
            </motion.span>
          )}
          {data.platformId && (
            <span className="data-chip">{data.platformId}</span>
          )}
          <span className="text-[10px] text-slate-500 bg-slate-800/60 border border-slate-700/40 px-2 py-0.5 rounded-full">
            {rooms.length} room{rooms.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {rooms.map((room, idx) => (
            <RoomCard
              key={`${room.roomType}-${idx}`}
              room={room}
              platformId={data.platformId}
              bookingUrl={data.bookingUrl}
              onTrackIntent={trackIntent}
              index={idx}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
