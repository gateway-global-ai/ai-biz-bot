import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Clock, DollarSign, Phone, Calendar, FileText, List } from 'lucide-react';

interface CanvasItem {
  label: string;
  value?: string;
  description?: string;
  price?: string;
  duration?: string;
}

interface SharedCanvasPanelProps {
  metadata: {
    canvas_type: 'service_menu' | 'schedule' | 'pricing_table' | 'faq_list' | 'intake_checklist' | 'business_summary' | 'custom_card';
    title: string;
    subtitle?: string;
    items: CanvasItem[];
    cta_label?: string;
    cta_action?: 'book' | 'call' | 'form' | 'link';
    accent_color?: 'indigo' | 'emerald' | 'amber' | 'rose';
  };
  onTriggerSpeech?: (text: string) => void;
  onContextUpdate?: (context: string) => void;
  onCancel?: () => void;
}

const ACCENT_CLASSES = {
  indigo: { border: 'border-indigo-500/30', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', cta: 'bg-indigo-500 hover:bg-indigo-400 text-white', dot: 'bg-indigo-400' },
  emerald: { border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', cta: 'bg-emerald-500 hover:bg-emerald-400 text-white', dot: 'bg-emerald-400' },
  amber: { border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', cta: 'bg-amber-500 hover:bg-amber-400 text-white', dot: 'bg-amber-400' },
  rose: { border: 'border-rose-500/30', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30', cta: 'bg-rose-500 hover:bg-rose-400 text-white', dot: 'bg-rose-400' },
};

const CTA_ICON = {
  book: Calendar,
  call: Phone,
  form: FileText,
  link: List,
};

function ServiceMenuItem({ item, accent, onSelect }: { item: CanvasItem; accent: typeof ACCENT_CLASSES['indigo']; onSelect: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded-xl bg-slate-800/50 border ${accent.border} flex items-start gap-3`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${accent.dot} mt-2 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-white text-sm font-medium leading-snug">{item.label}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.price && (
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded-lg border ${accent.badge}`}>{item.price}</span>
            )}
            {item.duration && (
              <span className="text-xs text-slate-500 flex items-center gap-0.5">
                <Clock size={10} />{item.duration}
              </span>
            )}
          </div>
        </div>
        {item.description && (
          <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{item.description}</p>
        )}
        {item.value && item.value !== item.label && (
          <p className="text-slate-400 text-xs mt-0.5">{item.value}</p>
        )}
      </div>
    </motion.div>
  );
}

function FaqItem({ item, index }: { item: CanvasItem; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-white text-sm font-medium leading-snug">{item.label}</span>
        {open ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-3 text-slate-400 text-xs leading-relaxed border-t border-slate-700/50">
          {item.value || item.description}
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ item, index, onCheck }: { item: CanvasItem; index: number; onCheck: (label: string, checked: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
          checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 bg-slate-800 group-hover:border-slate-400'
        }`}
        onClick={() => {
          const next = !checked;
          setChecked(next);
          onCheck(item.label, next);
        }}
      >
        {checked && <span className="text-white text-[10px] leading-none">✓</span>}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm leading-snug ${checked ? 'text-slate-500 line-through' : 'text-white'}`}>{item.label}</span>
        {item.description && <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>}
      </div>
    </label>
  );
}

function ScheduleItem({ item, onBook }: { item: CanvasItem; accent: typeof ACCENT_CLASSES['indigo']; onBook: (slot: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
      <div className="min-w-0">
        <span className="text-white text-sm font-medium">{item.label}</span>
        {item.description && <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onBook(item.label)}
        className="shrink-0 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-xs text-indigo-300 hover:bg-indigo-500/30 hover:text-white transition-colors"
      >
        Book
      </button>
    </div>
  );
}

export const SharedCanvasPanel: React.FC<SharedCanvasPanelProps> = ({
  metadata,
  onTriggerSpeech,
  onContextUpdate,
  onCancel,
}) => {
  const { canvas_type, title, subtitle, items = [], cta_label, cta_action, accent_color = 'indigo' } = metadata;
  const accent = ACCENT_CLASSES[accent_color] || ACCENT_CLASSES.indigo;
  const CtaIcon = cta_action ? CTA_ICON[cta_action] : null;

  const handleCtaClick = () => {
    if (onTriggerSpeech) {
      const actions = {
        book: `The user tapped "${cta_label}" — help them book.`,
        call: `The user wants to call. Provide the phone number and offer to help further.`,
        form: `The user wants to fill out the form. Guide them through it.`,
        link: `The user tapped "${cta_label}". Provide more information.`,
      };
      onTriggerSpeech(actions[cta_action || 'link'] || `The user tapped "${cta_label}".`);
    }
  };

  const handleBookSlot = (slot: string) => {
    onTriggerSpeech?.(`The user selected time slot: ${slot}. Please confirm their booking for this time.`);
  };

  const handleServiceSelect = (label: string) => {
    onTriggerSpeech?.(`The user is interested in: ${label}. Tell them more about it.`);
  };

  const handleCheck = (label: string, checked: boolean) => {
    onContextUpdate?.(`[Checklist update] "${label}" marked ${checked ? 'complete' : 'incomplete'}.`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative rounded-sui bg-slate-900/40 border ${accent.border} backdrop-blur-xl shadow-2xl overflow-hidden`}
    >
      {/* Header */}
      <div className={`px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-start justify-between gap-2`}>
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-sm leading-snug">{title}</h3>
          {subtitle && <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
        {canvas_type === 'faq_list' && items.map((item, i) => (
          <FaqItem key={i} item={item} index={i} />
        ))}

        {canvas_type === 'intake_checklist' && items.map((item, i) => (
          <ChecklistItem key={i} item={item} index={i} onCheck={handleCheck} />
        ))}

        {canvas_type === 'schedule' && items.map((item, i) => (
          <ScheduleItem key={i} item={item} accent={accent} onBook={handleBookSlot} />
        ))}

        {(canvas_type === 'service_menu' || canvas_type === 'pricing_table' || canvas_type === 'business_summary' || canvas_type === 'custom_card') && items.map((item, i) => (
          <ServiceMenuItem
            key={i}
            item={item}
            accent={accent}
            onSelect={() => handleServiceSelect(item.label)}
          />
        ))}
      </div>

      {/* CTA */}
      {cta_label && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={handleCtaClick}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-sui text-sm font-medium transition-colors ${accent.cta}`}
          >
            {CtaIcon && <CtaIcon size={14} />}
            {cta_label}
          </button>
        </div>
      )}
    </motion.div>
  );
};
