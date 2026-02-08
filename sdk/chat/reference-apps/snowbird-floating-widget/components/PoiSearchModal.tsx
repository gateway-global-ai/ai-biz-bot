
import React, { useState, useEffect } from 'react';
import { X, Search, MapPin, Loader2, Plus, Utensils, Ticket } from 'lucide-react';
import { Poi, LocationType } from '../types';
import { searchPois } from '../services/liteApiService';

interface PoiSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LocationType;
  onSelect: (poi: Poi) => void;
}

const PoiSearchModal: React.FC<PoiSearchModalProps> = ({ isOpen, onClose, type, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Poi[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setQuery('');
        setResults([]);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
        const data = await searchPois(query, type);
        setResults(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {type === LocationType.DINING ? <Utensils className="w-5 h-5 text-orange-500" /> : <Ticket className="w-5 h-5 text-rose-500" />}
            Add {type === LocationType.DINING ? 'Restaurant' : 'Activity'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900">
            <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={type === LocationType.DINING ? "e.g. Pizza in Milan" : "e.g. Museum tour"}
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                    autoFocus
                />
            </div>
            <button 
                onClick={handleSearch} 
                disabled={loading || !query.trim()}
                className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[50vh] p-4 bg-slate-50 dark:bg-slate-950 space-y-3">
            {results.map(poi => (
                <div key={poi.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex gap-3 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group" onClick={() => onSelect(poi)}>
                    <img src={poi.imageUrl} alt={poi.name} className="w-16 h-16 rounded object-cover bg-slate-200" />
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{poi.name}</h3>
                            <button className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1 rounded-full"><Plus className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{poi.description}</p>
                    </div>
                </div>
            ))}
            {!loading && results.length === 0 && query && (
                <p className="text-center text-slate-500 text-sm py-4">No results found.</p>
            )}
        </div>

      </div>
    </div>
  );
};

export default PoiSearchModal;
