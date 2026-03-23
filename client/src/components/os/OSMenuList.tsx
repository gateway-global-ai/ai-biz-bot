import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { OSMenuItem } from '@/hooks/useOSMenu';

interface OSMenuListProps {
  items: OSMenuItem[];
  onSelect?: (item: OSMenuItem) => void;
  columns?: 1 | 2;
  className?: string;
}

/**
 * OSMenuList — Universal OS menu renderer.
 * Modeled on VoiceSelector card pattern: icon + label + description per card.
 * Always white canvas background. No dark backgrounds.
 * Driven entirely by OSMenuItem[] — no hardcoded content.
 */
export function OSMenuList({ items, onSelect, columns = 2, className = '' }: OSMenuListProps) {
  const gridClass = columns === 1 ? 'grid-cols-1' : 'grid grid-cols-2';

  return (
    <div className={`${gridClass} gap-2 p-4 ${className}`}>
      {items.map((item, index) => (
        <OSMenuCard
          key={item.id}
          item={item}
          index={index}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface OSMenuCardProps {
  item: OSMenuItem;
  index: number;
  onSelect?: (item: OSMenuItem) => void;
}

function OSMenuCard({ item, index, onSelect }: OSMenuCardProps) {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect?.(item)}
      className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-left w-full hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all duration-150 group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
            {Icon && <Icon size={14} className="text-indigo-500" />}
          </div>
          <span className="text-sm font-semibold text-slate-800 leading-tight">{item.label}</span>
        </div>
        {hasChildren && (
          <ChevronRight size={12} className="text-slate-400 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
        )}
      </div>
      {item.description && (
        <p className="text-xs text-slate-500 leading-relaxed pl-9">{item.description}</p>
      )}
    </motion.button>
  );
}

export default OSMenuList;
