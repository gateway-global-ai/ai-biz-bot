
import React, { useState, useEffect } from 'react';
import { X, Plane, Calendar, User, Briefcase, ChevronDown, CheckCircle, Loader2 } from 'lucide-react';
import { FlightSearchParams, FlightOffer } from '../types';
import { searchFlights } from '../services/liteApiService';

interface FlightSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    arrivalCity: string;
    targetDate: string;
    mode: 'arrival' | 'departure';
    defaultReturnDate?: string;
    onSelect?: (flight: FlightOffer) => void;
    onArrivalCityChange?: (city: string) => void;
}

const FlightSearchModal: React.FC<FlightSearchModalProps> = ({ isOpen, onClose, arrivalCity, targetDate, mode, onSelect, defaultReturnDate, onArrivalCityChange }) => {
    const [step, setStep] = useState<'search' | 'results'>('search');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<FlightOffer[]>([]);
    const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
    
    // Form State
    const [departureCity, setDepartureCity] = useState('');
    const [tripType, setTripType] = useState<'round-trip' | 'one-way'>('round-trip');
    const [cabinClass, setCabinClass] = useState<'Economy' | 'Business' | 'First'>('Economy');
    const [passengers, setPassengers] = useState(1);
    const [bags, setBags] = useState(1);
    const [returnDate, setReturnDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep('search');
            setResults([]);
            setSelectedFlightId(null);
            setTripType('round-trip'); // Explicitly default to round-trip
            setReturnDate(defaultReturnDate || '');
        }
    }, [isOpen, defaultReturnDate]);

    const handleSearch = async () => {
        setLoading(true);
        const params: FlightSearchParams = {
            departureCity: mode === 'arrival' ? departureCity : arrivalCity,
            arrivalCity: mode === 'arrival' ? arrivalCity : departureCity, // In departure mode, we fly OUT of the destination
            departureDate: targetDate,
            returnDate: tripType === 'round-trip' ? returnDate : undefined,
            tripType,
            passengers,
            bags,
            cabinClass
        };

        try {
            const data = await searchFlights(params);
            setResults(data);
            setStep('results');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFlight = (flight: FlightOffer) => {
        setSelectedFlightId(flight.id);
        // Simulate API confirmation
        setTimeout(() => {
            if (onSelect) {
                onSelect(flight);
            } else {
                onClose();
            }
        }, 1000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full h-[100dvh] md:h-auto md:max-w-3xl md:max-h-[85vh] flex flex-col border-none md:border border-slate-200 dark:border-slate-700 overflow-hidden rounded-none md:rounded-xl shadow-2xl">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <Plane className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Check Flights</h2>
                            <p className="text-xs text-blue-100 opacity-90">Powered by Nuitee LiteAPI</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
                    {step === 'search' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            {/* Trip Type Tabs */}
                            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg w-fit">
                                <button 
                                    onClick={() => setTripType('one-way')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${tripType === 'one-way' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    One Way
                                </button>
                                <button 
                                    onClick={() => setTripType('round-trip')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${tripType === 'round-trip' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    Round Trip
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Departure City */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Departure City</label>
                                    <div className="relative">
                                        <Plane className="absolute left-3 top-3 w-5 h-5 text-slate-400 transform -rotate-45" />
                                        <input 
                                            type="text" 
                                            value={departureCity}
                                            onChange={(e) => setDepartureCity(e.target.value)}
                                            placeholder="e.g. New York (JFK)" 
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Arrival City */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Arrival City</label>
                                    <div className="relative">
                                        <Plane className="absolute left-3 top-3 w-5 h-5 text-slate-400 transform rotate-45" />
                                        <input 
                                            type="text" 
                                            value={arrivalCity}
                                            onChange={(e) => onArrivalCityChange ? onArrivalCityChange(e.target.value) : undefined}
                                            readOnly={!onArrivalCityChange}
                                            className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${!onArrivalCityChange ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        {mode === 'arrival' ? 'Departure Date' : 'Return Date'}
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <input 
                                            type="date" 
                                            value={targetDate}
                                            readOnly
                                            className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:[color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                {tripType === 'round-trip' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Return Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                            <input 
                                                type="date" 
                                                value={returnDate}
                                                onChange={(e) => setReturnDate(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:[color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Filters */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Passengers</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <select 
                                            value={passengers}
                                            onChange={(e) => setPassengers(Number(e.target.value))}
                                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none outline-none"
                                        >
                                            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 w-3 h-3 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Bags</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <select 
                                            value={bags}
                                            onChange={(e) => setBags(Number(e.target.value))}
                                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none outline-none"
                                        >
                                            {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 w-3 h-3 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Class</label>
                                    <div className="relative">
                                        <select 
                                            value={cabinClass}
                                            onChange={(e) => setCabinClass(e.target.value as any)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none outline-none"
                                        >
                                            <option value="Economy">Economy</option>
                                            <option value="Business">Business</option>
                                            <option value="First">First</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 w-3 h-3 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Search Button */}
                            <button 
                                onClick={handleSearch}
                                disabled={!departureCity || !arrivalCity || loading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all mt-4"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plane className="w-5 h-5" />}
                                {loading ? 'Finding Flights...' : 'Search Flights'}
                            </button>
                        </div>
                    )}

                    {step === 'results' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                             <button 
                                onClick={() => {
                                    setStep('search');
                                    setSelectedFlightId(null);
                                }}
                                className="text-sm text-blue-500 hover:underline mb-2 flex items-center gap-1"
                            >
                                ← Modify Search
                            </button>

                            <div className="space-y-3 pb-8 md:pb-0">
                                {results.map((flight) => (
                                    <div 
                                        key={flight.id} 
                                        className={`
                                            bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all cursor-pointer group
                                            ${selectedFlightId === flight.id 
                                                ? 'border-emerald-500 ring-1 ring-emerald-500' 
                                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'}
                                        `}
                                        onClick={() => !selectedFlightId && handleSelectFlight(flight)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                {/* Airline Logo Mock */}
                                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                                                    <Plane className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{flight.airline}</h3>
                                                    <p className="text-xs text-slate-500">{flight.flightNumber} • {flight.stops === 0 ? 'Direct' : `${flight.stops} Stop`}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-slate-900 dark:text-white">{flight.currency} {flight.price}</p>
                                                <p className="text-xs text-slate-500">per person</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{flight.departureTime}</p>
                                                <p className="text-xs text-slate-500">{departureCity.split(' ')[0]}</p>
                                            </div>
                                            <div className="flex-1 flex flex-col items-center gap-1">
                                                <p className="text-[10px] text-slate-400">{flight.duration}</p>
                                                <div className="w-full h-px bg-slate-300 dark:bg-slate-600 relative">
                                                    <Plane className="absolute right-0 -top-1.5 w-3 h-3 text-slate-400 transform rotate-90" />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{flight.arrivalTime}</p>
                                                <p className="text-xs text-slate-500">{arrivalCity.split(' ')[0]}</p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectFlight(flight);
                                            }}
                                            disabled={selectedFlightId !== null}
                                            className={`w-full mt-3 py-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-2
                                                ${selectedFlightId === flight.id 
                                                    ? 'bg-emerald-600 text-white' 
                                                    : 'bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white'}
                                            `}
                                        >
                                            {selectedFlightId === flight.id ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    Flight Selected
                                                </>
                                            ) : (
                                                'Select Flight'
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FlightSearchModal;
