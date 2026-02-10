import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Percent, ShieldCheck } from 'lucide-react';

interface MarkupProps {
  netPrice: number;
  currency: string;
  onFinalPriceChange?: (finalPrice: number) => void;
}

/**
 * Agent Markup Component
 * Allows B2B agents to calculate selling prices by applying percentage or fixed markups.
 * Designed for real-time transactional confidence.
 */
export const AgentMarkupComponent: React.FC<MarkupProps> = ({ 
  netPrice, 
  currency = 'USD',
  onFinalPriceChange 
}) => {
  const [markupType, setMarkupType] = useState<'percentage' | 'fixed'>('percentage');
  const [markupValue, setMarkupValue] = useState<number>(15); // Default 15%

  const finalPrice = useMemo(() => {
    let price = netPrice;
    if (markupType === 'percentage') {
      price = netPrice * (1 + markupValue / 100);
    } else {
      price = netPrice + markupValue;
    }
    
    if (onFinalPriceChange) onFinalPriceChange(price);
    return price;
  }, [netPrice, markupType, markupValue, onFinalPriceChange]);

  const commission = finalPrice - netPrice;

  return (
  return (
    <Card className="w-full bg-white border-slate-100 text-text-primary shadow-xl">
      <CardHeader className="pb-2 border-b border-slate-50 bg-slate-50/50">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#1E3A8A]">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          B2B Pricing Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex justify-between items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
          <div>
            <Label className="text-[10px] uppercase text-text-secondary font-bold">Net Price (API)</Label>
            <div className="text-lg font-mono font-bold text-text-primary">
              {currency} {netPrice.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <Label className="text-[10px] uppercase text-emerald-600 font-bold">Your Commission</Label>
            <div className="text-lg font-mono font-bold text-emerald-600">
              +{currency} {commission.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-text-secondary">Markup Type</Label>
            <div className="flex bg-slate-100 rounded-md p-1">
              <button
                onClick={() => setMarkupType('percentage')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded transition-all ${
                  markupType === 'percentage' ? 'bg-[#E91E63] text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Percent className="w-3 h-3" /> Percentage
              </button>
              <button
                onClick={() => setMarkupType('fixed')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded transition-all ${
                  markupType === 'fixed' ? 'bg-[#E91E63] text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <DollarSign className="w-3 h-3" /> Fixed
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-text-secondary">Markup Value</Label>
            <div className="relative">
              <Input
                type="number"
                value={markupValue}
                onChange={(e) => setMarkupValue(Number(e.target.value))}
                className="bg-slate-50 border-slate-200 h-9 text-sm pr-8 focus:ring-2 focus:ring-[#E91E63]/10 focus:border-[#E91E63]/30"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                {markupType === 'percentage' ? '%' : currency}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#E91E63]" />
              <span className="text-xs font-bold text-text-primary">Final Selling Price</span>
            </div>
            <Badge variant="outline" className="bg-[#E91E63]/5 text-[#E91E63] border-[#E91E63]/20 text-lg py-1 px-3 font-mono font-bold">
              {currency} {finalPrice.toLocaleString()}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
