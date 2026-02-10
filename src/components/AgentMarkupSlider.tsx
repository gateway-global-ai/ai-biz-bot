import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Percent, TrendingUp, DollarSign } from 'lucide-react';

interface MarkupSliderProps {
  netPrice: number;
  currency: string;
  defaultMarkup?: number;
  onMarkupChange?: (markup: number, finalPrice: number) => void;
}

/**
 * Agent Markup Slider
 * Precision tool for B2B agents to adjust their commission in real-time.
 * Used within the Agent Curation Panel before dragging items into the itinerary.
 */
export const AgentMarkupSlider: React.FC<MarkupSliderProps> = ({
  netPrice,
  currency = 'USD',
  defaultMarkup = 15,
  onMarkupChange
}) => {
  const [markup, setMarkup] = useState<number>(defaultMarkup);

  const finalPrice = useMemo(() => {
    const price = netPrice * (1 + markup / 100);
    return Math.round(price * 100) / 100;
  }, [netPrice, markup]);

  const commission = finalPrice - netPrice;

  const handleSliderChange = (value: number[]) => {
    const newMarkup = value[0];
    setMarkup(newMarkup);
    if (onMarkupChange) onMarkupChange(newMarkup, finalPrice);
  };

  return (
    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-purple-400" />
          <Label className="text-xs font-semibold text-slate-300">Agent Markup</Label>
        </div>
        <Badge variant="secondary" className="bg-purple-600 text-white font-mono">
          {markup}%
        </Badge>
      </div>

      <Slider
        defaultValue={[defaultMarkup]}
        max={50}
        step={0.5}
        onValueChange={handleSliderChange}
        className="py-4"
      />

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-slate-500 tracking-wider">Net Price</Label>
          <div className="text-sm font-mono text-slate-300">
            {currency} {netPrice.toLocaleString()}
          </div>
        </div>
        <div className="space-y-1 text-right">
          <Label className="text-[10px] uppercase text-emerald-500 tracking-wider">Commission</Label>
          <div className="text-sm font-mono text-emerald-400 font-bold">
            +{currency} {commission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="bg-purple-950/30 p-3 rounded-lg border border-purple-500/20 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-purple-200">Client Price</span>
        </div>
        <div className="text-lg font-mono font-black text-white">
          {currency} {finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
};

// Helper for useMemo since it's not imported
import { useMemo } from 'react';
