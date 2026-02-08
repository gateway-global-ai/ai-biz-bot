import React from 'react';
import { TravelPackage } from '../types';
import { CreditCard, Snowflake, Award, Zap } from 'lucide-react';

interface PackageSelectorProps {
  packages: TravelPackage[];
  selectedPackageId: string;
  onSelect: (pkg: TravelPackage) => void;
}

const PackageSelector: React.FC<PackageSelectorProps> = ({ packages, selectedPackageId, onSelect }) => {
  const getIcon = (id: string) => {
    switch(id) {
        case 'pkg1': return <Snowflake className="w-4 h-4" />;
        case 'pkg2': return <Award className="w-4 h-4" />;
        case 'pkg3': return <CreditCard className="w-4 h-4" />;
        case 'pkg4': return <Zap className="w-4 h-4" />;
        default: return <Snowflake className="w-4 h-4" />;
    }
  }

  return (
    <div className="flex md:grid md:grid-cols-4 overflow-x-auto md:overflow-visible gap-3 p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 snap-x no-scrollbar transition-colors duration-300">
      {packages.map((pkg) => {
        const isSelected = selectedPackageId === pkg.id;
        return (
          <button
            key={pkg.id}
            onClick={() => onSelect(pkg)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 min-w-[140px] md:min-w-0 flex-none snap-center
              ${isSelected 
                ? 'bg-blue-600 text-white shadow-lg md:scale-105' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'}
            `}
          >
            <div className="mb-1">{getIcon(pkg.id)}</div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">{pkg.duration}</span>
            <span className="text-sm font-medium truncate w-full text-center">{pkg.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PackageSelector;