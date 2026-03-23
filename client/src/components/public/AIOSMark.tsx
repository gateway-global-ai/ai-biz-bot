import React from "react";

interface AIOSMarkProps {
  compact?: boolean;
}

export default function AIOSMark({ compact = false }: AIOSMarkProps) {
  const boxSize = compact ? "h-14 w-14 text-2xl" : "h-20 w-20 text-4xl md:h-24 md:w-24 md:text-5xl";
  const gap = compact ? "gap-3" : "gap-4 md:gap-5";
  const radius = compact ? "rounded-[14px]" : "rounded-[18px]";
  const shadow = "shadow-[0_18px_34px_rgba(0,150,63,0.16)]";
  const colonSize = compact ? "text-4xl" : "text-5xl md:text-6xl";

  return (
    <div className={`flex items-center ${gap}`}>
      <div className={`relative flex ${boxSize} items-center justify-center ${radius} bg-[#00963F] font-bold text-white ${shadow}`}>
        AI
        <div className={`absolute -left-3 -top-2 font-semibold text-emerald-300/80 ${colonSize}`}>
          : :
        </div>
      </div>
      <div className={`flex ${boxSize} items-center justify-center ${radius} bg-[#00963F] font-bold text-white ${shadow}`}>
        O
      </div>
      <div className={`flex ${boxSize} items-center justify-center ${radius} bg-[#00963F] font-bold text-white ${shadow}`}>
        S
      </div>
    </div>
  );
}
