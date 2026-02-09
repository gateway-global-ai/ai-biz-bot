
import React, { useState } from 'react';
import { X, Calendar, MapPin, Users, Search, Home, DollarSign } from 'lucide-react';

interface HotelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (searchParams: { 
    location: string; 
    checkIn: string; 
    checkOut: string; 
    guests: number;
    housingTypes: string[];
    budget?: { amount: string; frequency: string };
  }) => void;
}

const HOUSING_OPTIONS = [
  { id: 'extended_stay', label: 'Extended Stay Hotel', disabled: false },
  { id: 'hotel', label: 'Hotel', disabled: false },
  { id: 'apartment', label: 'Apartment', disabled: true },
  { id: 'house', label: 'House', disabled: true },
  { id: 'shared', label: 'Shared Housing', disabled: true },
];

export const HotelSearchModal: React.FC<HotelSearchModalProps> = ({ isOpen, onClose, onSearch }) => {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  
  // New Filter State
  const [housingTypes, setHousingTypes] = useState<string[]>(['extended_stay']);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetFrequency, setBudgetFrequency] = useState('daily');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !checkIn || !checkOut) return;
    
    onSearch({ 
        location, 
        checkIn, 
        checkOut, 
        guests,
        housingTypes,
        budget: budgetAmount ? { amount: budgetAmount, frequency: budgetFrequency } : undefined
    });
    onClose();
  };

  const toggleHousingType = (id: string) => {
      setHousingTypes(prev => {
          if (prev.includes(id)) {
              return prev.filter(t => t !== id);
          }
          return [...prev, id];
      });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Search size={18} className="text-indigo-600"/>
            Find Accommodation
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Destination */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Destination</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text" 
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City or Area (e.g. Dallas)"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Check-in</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input 
                        type="date" 
                        required
                        value={checkIn}
                        onChange={e => setCheckIn(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-600"
                    />
                </div>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Check-out</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input 
                        type="date" 
                        required
                        value={checkOut}
                        onChange={e => setCheckOut(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-600"
                    />
                </div>
             </div>
          </div>

          {/* Accommodation Type */}
          <div>
              <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <Home size={12} />
                  Accommodation Type
              </label>
              <div className="flex flex-wrap gap-2">
                  {HOUSING_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => !opt.disabled && toggleHousingType(opt.id)}
                        title={opt.disabled ? "Inventory coming soon" : ""}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            opt.disabled
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                            : housingTypes.includes(opt.id)
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                          {opt.label}
                      </button>
                  ))}
              </div>
          </div>

          {/* Budget & Guests */}
          <div className="grid grid-cols-2 gap-3">
             {/* Budget */}
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Budget (Optional)</label>
                <div className="flex rounded-lg shadow-sm">
                    <div className="relative flex-grow focus-within:z-10">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-500 sm:text-sm">$</span>
                        </div>
                        <input
                            type="number"
                            name="price"
                            id="price"
                            className="block w-full rounded-l-lg border-y border-l border-slate-200 bg-slate-50 py-2 pl-6 pr-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                            placeholder="0"
                            value={budgetAmount}
                            onChange={(e) => setBudgetAmount(e.target.value)}
                        />
                    </div>
                    <select
                        className="rounded-r-lg border border-slate-200 bg-slate-100 py-2 pl-2 pr-1 text-xs text-slate-600 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none hover:bg-slate-200 cursor-pointer"
                        value={budgetFrequency}
                        onChange={(e) => setBudgetFrequency(e.target.value)}
                    >
                        <option value="daily">/ Day</option>
                        <option value="weekly">/ Wk</option>
                        <option value="monthly">/ Mo</option>
                    </select>
                </div>
             </div>

             {/* Guests */}
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Guests</label>
                <div className="relative">
                    <Users className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                        type="number" 
                        min="1" 
                        max="10"
                        required
                        value={guests}
                        onChange={e => setGuests(parseInt(e.target.value))}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                </div>
             </div>
          </div>

          <button 
            type="submit"
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            <Search size={16} />
            Search Availability
          </button>
        </form>
      </div>
    </div>
  );
};
