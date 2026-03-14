import React from "react";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
  description?: string;
}

export function Slider({
  label,
  value,
  onChange,
  color,
  description,
}: SliderProps) {
  return (
    <div className="space-y-1 group">
      <div className="flex items-end justify-between">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors group-hover:text-slate-300">
          {label}
        </label>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {value}%
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-current h-1"
        style={{ color }}
      />
      {description ? (
        <p className="text-[9px] italic leading-tight text-slate-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}
