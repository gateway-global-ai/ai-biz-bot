
import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  color: string;
  description?: string;
}

export const Slider: React.FC<SliderProps> = ({ label, value, onChange, color, description }) => {
  return (
    <div className="space-y-1 group">
      <div className="flex justify-between items-end">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">
          {label}
        </label>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-current"
        style={{ color }}
      />
      {description && <p className="text-[9px] text-slate-600 italic leading-tight">{description}</p>}
    </div>
  );
};
