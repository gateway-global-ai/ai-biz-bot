
import React, { useState, useEffect, useMemo } from 'react';
import { PACKAGES } from './constants';
import { TravelPackage, DayItinerary, Poi, LocationType, FlightOffer, HotelOffer, Coordinates } from './types';
import PackageSelector from './components/PackageSelector';
import ItinerarySidebar from './components/ItinerarySidebar';
import MapDisplay from './components/MapDisplay';
import ChatWidget from './components/ChatWidget';
import HotelSearchModal from './components/HotelSearchModal';
import FlightSearchModal from './components/FlightSearchModal';
import PoiSearchModal from './components/PoiSearchModal';
import { Plane, Calendar, ExternalLink, Calculator, CreditCard, Map as MapIcon, List, Sun, Moon, ArrowLeft, ArrowRight, Menu, Home, Briefcase } from 'lucide-react';

// Date Utility Helpers
const getRelativeDate = (baseDateStr: string, offsetDays: number) => {
    try {
        const d = new Date(baseDateStr);
        if (isNaN(d.getTime())) {
            return { display: offsetDays < 0 ? "Arrival Day" : "Departure Day", iso: "2026-02-01" };
        }
        d.setDate(d.getDate() + offsetDays);
        return {
            display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            iso: d.toISOString().split('T')[0] // YYYY-MM-DD
        };
    } catch (e) {
        return { display: offsetDays < 0 ? "Arrival Day" : "Departure Day", iso: "2026-02-01" };
    }
};

const PackageIntro: React.FC<{ 
    packageData: TravelPackage; 
    onEnter: () => void; 
    isDarkMode: boolean 
}> = ({ packageData, onEnter, isDarkMode }) => {
    // Prefer the first actual event day image (index 1 in enhanced array) over the generic travel day image
    // If empty days (pkg4 start), fallback to default
    const heroImage = packageData.days[1]?.pois[0]?.imageUrl || packageData.days[0]?.pois[0]?.imageUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80';

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900">
            <div className="absolute inset-0 z-0">
                <img 
                    src={heroImage} 
                    alt={packageData.name} 
                    className="w-full h-full object-cover opacity-60 animate-in fade-in duration-1000 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/30"></div>
                <div className="absolute inset-0 bg-black/20"></div>
            </div>

            <div className="relative z-10 max-w-2xl w-full mx-4 text-center animate-in slide-in-from-bottom-10 fade-in duration-700">
                <div className="mb-6 flex justify-center">
                    <div className="bg-blue-600/20 backdrop-blur-md border border-blue-500/50 p-4 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.3)]">
                        <Plane className="w-10 h-10 text-blue-400" />
                    </div>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-2xl">
                    {packageData.name}
                </h1>
                
                <div className="flex items-center justify-center gap-4 text-slate-300 mb-8 font-medium tracking-wide">
                    <span className="uppercase tracking-widest text-xs border border-slate-600 px-3 py-1 rounded-full bg-slate-900/50 backdrop-blur-sm">{packageData.duration}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="uppercase tracking-widest text-xs border border-slate-600 px-3 py-1 rounded-full bg-slate-900/50 backdrop-blur-sm">{packageData.tagline}</span>
                </div>

                <p className="text-lg md:text-xl text-slate-200 mb-10 leading-relaxed max-w-xl mx-auto drop-shadow-md">
                    {packageData.description}
                </p>

                <button 
                    onClick={onEnter}
                    className="group relative inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                    <span>View Full Itinerary</span>
                    <div className="bg-slate-900 rounded-full p-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </button>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [packages, setPackages] = useState<TravelPackage[]>(PACKAGES); // State to allow modification
  const [selectedPackageId, setSelectedPackageId] = useState<string>(PACKAGES[0].id);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [viewMode, setViewMode] = useState<'splash' | 'itinerary'>('splash');
  const [activePoiId, setActivePoiId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showHacks, setShowHacks] = useState(false);
  const [showPackages, setShowPackages] = useState(true);
  
  // Hotel Search State
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [hotelSearchLocation, setHotelSearchLocation] = useState<{lat: number, lng: number} | null>(null);
  const [hotelSearchName, setHotelSearchName] = useState('');
  const [hotelSearchDate, setHotelSearchDate] = useState('');
  const [hotelFlyTo, setHotelFlyTo] = useState<{start: Coordinates, end: Coordinates} | null>(null);

  // Flight Search State
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [flightMode, setFlightMode] = useState<'arrival' | 'departure'>('arrival');
  const [flightTargetDate, setFlightTargetDate] = useState('');
  const [flightReturnDate, setFlightReturnDate] = useState('');
  const [flightCity, setFlightCity] = useState('');
  const [activeFlightPoiId, setActiveFlightPoiId] = useState<string | null>(null);
  const [selectedFlights, setSelectedFlights] = useState<Record<string, FlightOffer>>({});

  // POI Search State (Build Your Own)
  const [isPoiModalOpen, setIsPoiModalOpen] = useState(false);
  const [poiSearchType, setPoiSearchType] = useState<LocationType>(LocationType.EVENT);
  const [editingDayNumber, setEditingDayNumber] = useState<number | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const enhancedPackages = useMemo(() => {
    return packages.map(pkg => {
        const newPkg = JSON.parse(JSON.stringify(pkg)) as TravelPackage;
        
        // Logic to determine initial flight name
        const startPoiId = `travel-start-${pkg.id}`;
        const selectedStartFlight = selectedFlights[startPoiId];
        
        // Dynamic properties based on selection state
        let startNodeName = "Arrive in Italy";
        let startNodeDesc = "Check flights to arrive the morning of or day before the event.";
        let startNodeCoords = { lat: 45.6301, lng: 8.7255 }; // Default to Milan

        if (selectedStartFlight) {
            const city = selectedStartFlight.arrivalCity.split('(')[0].trim();
            startNodeName = `Arrive in ${city}`;
            startNodeDesc = `Flight from ${selectedStartFlight.departureCity} • ${selectedStartFlight.airline}`;
            startNodeCoords = selectedStartFlight.arrivalCoords;
        } else if (pkg.id === 'pkg4' && pkg.days.length === 0) {
            // Special initial state for Build Your Own Adventure
            startNodeName = "Select Destination";
            startNodeDesc = "Choose your arrival flight to start building your itinerary.";
            // Center roughly on Italy to show potential
            startNodeCoords = { lat: 41.8719, lng: 12.5674 }; 
        }

        // Handle Empty Package (Builder Mode Initial State)
        if (newPkg.days.length === 0) {
             const defaultStart = 'Tue Feb 10, 2026'; // Default start date
             const arrivalInfo = getRelativeDate(defaultStart, -1);
             
             const travelDayStart: DayItinerary = {
                dayNumber: 0,
                date: arrivalInfo.display,
                title: selectedStartFlight ? "Travel Day" : "Start Your Journey",
                description: "Book your flight to begin building your itinerary.",
                pois: [
                    {
                        id: startPoiId,
                        name: startNodeName,
                        type: LocationType.FLIGHT_START,
                        description: startNodeDesc,
                        coordinates: startNodeCoords, 
                        imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80",
                        summary: "Start here.",
                        time: "Arrival"
                    }
                ]
             };
             newPkg.days = [travelDayStart];
             return newPkg;
        }

        const firstDay = newPkg.days[0];
        const lastDay = newPkg.days[newPkg.days.length - 1];
        const arrivalInfo = getRelativeDate(firstDay.date, -1);
        const departureInfo = getRelativeDate(lastDay.date, 1);
        
        const travelDayStart: DayItinerary = {
            dayNumber: 0,
            date: arrivalInfo.display,
            title: "Travel to Italy",
            description: "Fly into Milan or Venice. Start your journey 1 day before events begin.",
            pois: [
                {
                    id: startPoiId,
                    name: startNodeName,
                    type: LocationType.FLIGHT_START,
                    description: startNodeDesc,
                    coordinates: selectedStartFlight ? startNodeCoords : firstDay.pois[0].coordinates, // Use flight coords if selected, else default to first day location
                    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80",
                    summary: "Search for the best flight options using our Nuitee integration.",
                    time: "Morning Arrival"
                }
            ]
        };

        const travelDayEnd: DayItinerary = {
            dayNumber: 999,
            date: departureInfo.display,
            title: "Return Home",
            description: "Transit to airport and fly home.",
            pois: [
                {
                    id: `travel-end-${pkg.id}`,
                    name: "Depart Italy",
                    type: LocationType.FLIGHT_END,
                    description: "Check return flights if you haven't booked a round-trip.",
                    coordinates: lastDay.pois[0]?.coordinates || { lat: 45.6301, lng: 8.7255 },
                    imageUrl: "https://images.unsplash.com/photo-1542296332-2e44a991aff9?auto=format&fit=crop&w=800&q=80",
                    summary: "Secure your return journey.",
                    time: "Flexible Departure"
                }
            ]
        };

        newPkg.days.unshift(travelDayStart);
        newPkg.days.push(travelDayEnd);
        return newPkg;
    });
  }, [packages, selectedFlights]); // Added selectedFlights to dependencies

  const selectedPackage = useMemo(() => 
    enhancedPackages.find(p => p.id === selectedPackageId) || enhancedPackages[0]
  , [selectedPackageId, enhancedPackages]);

  const [selectedDay, setSelectedDay] = useState<DayItinerary>(selectedPackage.days[0]);

  // Sync selected day when package changes
  useEffect(() => {
    setSelectedDay(selectedPackage.days[0]);
    setViewMode('splash');
    setShowPackages(true); 
    if (selectedPackage.days[0].pois.length > 0) {
      setActivePoiId(selectedPackage.days[0].pois[0].id);
    } else {
      setActivePoiId(null);
    }
  }, [selectedPackageId]); // Use selectedPackageId dependency to avoid reset loops when editing

  const handleDaySelect = (day: DayItinerary) => {
    setSelectedDay(day);
    if (day.pois.length > 0) {
        setActivePoiId(day.pois[0].id);
    } else {
        setActivePoiId(null);
    }
  };

  const handleBookHotel = (poi: Poi) => {
    setHotelSearchLocation(poi.coordinates);
    setHotelSearchName(poi.name);
    setHotelSearchDate(selectedDay.date);
    setIsHotelModalOpen(true);
  };

  const handleHotelBookingConfirmed = (hotel: HotelOffer) => {
      // Trigger fly-to animation from current search location to new hotel location
      if (hotelSearchLocation && hotel.coordinates) {
          setHotelFlyTo({
              start: hotelSearchLocation,
              end: hotel.coordinates
          });
          
          // Switch to map view on mobile if needed
          if (window.innerWidth < 768) {
              setMobileView('map');
          }
      }
  };

  const handleBookFlight = (mode: 'arrival' | 'departure', poiId: string) => {
      setFlightMode(mode);
      setActiveFlightPoiId(poiId);
      
      let targetDateISO = '';
      let returnDateISO = '';

      if (selectedPackageId === 'pkg4' && packages.find(p => p.id === 'pkg4')?.days.length === 0) {
           // Special logic for empty package start
           targetDateISO = '2026-02-10'; // Default start
           returnDateISO = '2026-02-17';
           setFlightCity(''); // Clear default to allow user to type in modal
      } else {
          const firstEventDay = selectedPackage.days[1];
          const lastEventDay = selectedPackage.days[selectedPackage.days.length - 2];
          
          const returnDateObj = getRelativeDate(lastEventDay.date, 1);
          returnDateISO = returnDateObj.iso;

          if (mode === 'arrival') {
              const d = getRelativeDate(firstEventDay.date, -1);
              targetDateISO = d.iso;
          } else {
              targetDateISO = returnDateObj.iso;
          }
          const locationName = mode === 'arrival' ? selectedPackage.days[1].pois[0].name : selectedPackage.days[selectedPackage.days.length - 2].pois[0].name;
          const isVenice = locationName.toLowerCase().includes('venice') || selectedPackage.name.includes('Venice');
          setFlightCity(isVenice ? 'Venice (VCE)' : 'Milan (MXP)');
      }

      setFlightReturnDate(returnDateISO);
      setFlightTargetDate(targetDateISO);
      setIsFlightModalOpen(true);
  };

  const handleFlightSelect = (flight: FlightOffer) => {
      if (activeFlightPoiId) {
          setSelectedFlights(prev => ({
              ...prev,
              [activeFlightPoiId]: flight
          }));

          // NEW: If this is the start flight for the empty builder package, initialize Day 1
          if (selectedPackageId === 'pkg4' && activeFlightPoiId.includes('travel-start')) {
                setPackages(prev => {
                    const newPkgs = [...prev];
                    const pkgIdx = newPkgs.findIndex(p => p.id === 'pkg4');
                    if (pkgIdx !== -1 && newPkgs[pkgIdx].days.length === 0) {
                        const startDate = 'Tue Feb 10, 2026';
                        newPkgs[pkgIdx].days.push({
                           dayNumber: 1,
                           date: startDate,
                           title: `Arrival in ${flight.arrivalCity.split('(')[0].trim()}`,
                           description: 'You have arrived! Start adding activities using the buttons below.',
                           pois: []
                        });
                    }
                    return newPkgs;
                });
          }

          // Switch to map view to show the flight simulation immediately
          setMobileView('map');
      }
      setIsFlightModalOpen(false);
  };

  const handlePoiSelect = (poiId: string) => {
    // Find day containing this POI to switch day view if needed
    const targetDay = selectedPackage.days.find(d => d.pois.some(p => p.id === poiId));
    if (targetDay && targetDay.dayNumber !== selectedDay.dayNumber) {
        setSelectedDay(targetDay);
    }

    setActivePoiId(poiId);
    if (window.innerWidth < 768) {
      setMobileView('map');
    }
  };

  // Build Your Own Logic
  const isEditable = selectedPackageId === 'pkg4';

  const handleAddDay = () => {
      setPackages(prev => {
          const newPackages = [...prev];
          const pkgIndex = newPackages.findIndex(p => p.id === 'pkg4');
          if (pkgIndex === -1) return prev;

          const pkg = newPackages[pkgIndex];
          const lastDayNumber = pkg.days.length > 0 ? pkg.days[pkg.days.length - 1].dayNumber : 0;
          const prevDate = pkg.days.length > 0 ? pkg.days[pkg.days.length - 1].date : 'Tue Feb 10, 2026'; // Default start

          const nextDateObj = getRelativeDate(prevDate, 1);
          
          const newDay: DayItinerary = {
              dayNumber: lastDayNumber + 1,
              date: nextDateObj.display,
              title: `Day ${lastDayNumber + 1} - Custom Adventure`,
              description: 'Your custom itinerary continues.',
              pois: []
          };

          pkg.days.push(newDay);
          return newPackages;
      });
  };

  const handleOpenAddPoiModal = (dayNumber: number, type: LocationType) => {
      setEditingDayNumber(dayNumber);
      setPoiSearchType(type);
      setIsPoiModalOpen(true);
  };

  const handleAddPoi = (poi: Poi) => {
      if (editingDayNumber === null) return;
      
      setPackages(prev => {
          const newPackages = [...prev];
          const pkgIndex = newPackages.findIndex(p => p.id === 'pkg4');
          if (pkgIndex === -1) return prev;

          const pkg = newPackages[pkgIndex];
          const dayIndex = pkg.days.findIndex(d => d.dayNumber === editingDayNumber);
          
          if (dayIndex !== -1) {
              pkg.days[dayIndex].pois.push(poi);
          }
          return newPackages;
      });
      setIsPoiModalOpen(false);
      setActivePoiId(poi.id); // Auto select new item
      // Force map update by updating selected day
      // Wait for next render cycle via effect or simple re-select logic handled by App re-render
  };

  // Determine if the active POI is a flight that we have booked
  const activeBookedFlight = useMemo(() => {
      if (!activePoiId) return null;
      return selectedFlights[activePoiId] || null;
  }, [activePoiId, selectedFlights]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const totalPrice = useMemo(() => {
    let total = 0;
    selectedPackage.days.forEach(day => {
        day.pois.forEach(poi => {
            if (selectedFlights[poi.id]) {
                const flight = selectedFlights[poi.id];
                const priceInUSD = flight.currency === 'EUR' ? flight.price * 1.1 : flight.price;
                total += priceInUSD;
            } else if (poi.price) {
                const priceInUSD = poi.currency === 'EUR' ? poi.price * 1.1 : poi.price;
                total += priceInUSD;
            }
        });
    });
    return Math.round(total);
  }, [selectedPackage, selectedFlights]);

  const handlePackageSelect = (pkg: TravelPackage) => {
      setSelectedPackageId(pkg.id);
      setViewMode('itinerary');
      setShowPackages(false); // Nest/Hide packages when a package is selected
  };

  const goHome = () => {
      setViewMode('splash');
      setShowPackages(true);
  };

  // Get the most relevant image for the package (prefer day 1 over the travel day)
  const sidebarHeroImage = selectedPackage.days[1]?.pois[0]?.imageUrl || selectedPackage.days[0]?.pois[0]?.imageUrl || '';

  return (
    <div className="flex flex-col h-full md:h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <header className="relative flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 md:py-5 flex items-center justify-between z-20 shadow-md dark:shadow-xl overflow-hidden group transition-colors duration-300">
        <div className={`absolute inset-0 z-0 bg-slate-900 transition-opacity duration-500 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}>
            <video 
                autoPlay loop muted playsInline crossOrigin="anonymous"
                className="w-full h-full object-cover opacity-60 scale-105 group-hover:scale-110 transition-transform duration-[20s] ease-linear"
            >
                <source src="https://travel.pidea.ai/events/milano-cortina-2026/videos/_header_globe_bg.mp4" type="video/mp4" />
                <source src="https://videos.pexels.com/video-files/3195566/3195566-uhd_2560_1440_25fps.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-slate-900/50"></div>
        </div>
        <div className={`absolute inset-0 z-0 bg-gradient-to-r from-blue-50 to-white transition-opacity duration-500 ${isDarkMode ? 'opacity-0' : 'opacity-100'}`}></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-blue-600/90 backdrop-blur-sm p-2 rounded-lg border border-blue-500/50 shadow-lg shadow-blue-900/20">
            <Plane className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm leading-tight transition-colors">Snowbird Travel Company</h1>
            <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-200 font-medium hidden xs:block transition-colors">Winter Olympics 2026 Experience</p>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center gap-2 md:gap-4 text-sm font-medium text-slate-600 dark:text-slate-300">
           {/* New Controls */}
           <button 
             onClick={goHome}
             className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-blue-200 border border-slate-200 dark:border-slate-700 backdrop-blur-sm transition-all shadow-sm"
             title="Home"
           >
             <Home className="w-4 h-4" />
           </button>
           <button 
             onClick={() => setShowPackages(!showPackages)}
             className={`p-2 rounded-full backdrop-blur-sm transition-all shadow-sm border ${showPackages ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-blue-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'}`}
             title={showPackages ? "Hide Packages" : "Show Packages"}
           >
             <Briefcase className="w-4 h-4" />
           </button>

           <div className="hidden md:flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
             <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
             <span>Feb 6 - Feb 22, 2026</span>
           </div>
           <button 
             onClick={() => setShowHacks(!showHacks)}
             className={`hidden md:block p-2 rounded-full backdrop-blur-sm transition-all shadow-sm border ${showHacks ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20' : 'bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-blue-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'}`}
             title={showHacks ? "Hide Travel Hacks" : "Show Travel Hacks"}
           >
             <div className="flex items-center justify-center w-4 h-4 border-2 border-current rounded-full text-[10px] font-bold leading-none">$</div>
           </button>
           <button 
             onClick={toggleTheme}
             className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-blue-200 border border-slate-200 dark:border-slate-700 backdrop-blur-sm transition-all shadow-sm"
             aria-label="Toggle theme"
           >
             {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" /> }
           </button>
           <a href="#" className="hidden md:flex items-center gap-1 text-white hover:text-blue-50 transition-colors bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-full backdrop-blur-sm shadow-md">
             <span>Book Consultation</span>
             <ExternalLink className="w-3 h-3" />
           </a>
        </div>
      </header>

      <div className={`flex-none z-10 transition-all duration-500 ease-in-out overflow-hidden ${showPackages ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
        <PackageSelector 
          packages={packages} 
          selectedPackageId={selectedPackageId}
          onSelect={handlePackageSelect}
        />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === 'splash' && (
            <PackageIntro 
                packageData={selectedPackage} 
                onEnter={() => {
                    setViewMode('itinerary');
                    setShowPackages(false);
                }} 
                isDarkMode={isDarkMode}
            />
        )}

        <div className={`
            w-full md:w-[400px] flex-col border-r border-slate-200 dark:border-slate-800 z-0 relative bg-white dark:bg-slate-900 transition-colors duration-300
            ${mobileView === 'list' && viewMode !== 'splash' ? 'flex' : 'hidden md:flex'}
            ${viewMode === 'splash' ? 'md:hidden' : ''} 
        `}>
           <div className="relative shrink-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-slate-900 overflow-hidden">
               {/* Background Image */}
               <div className="absolute inset-0 z-0">
                   <img 
                       src={sidebarHeroImage} 
                       alt="" 
                       className="w-full h-full object-cover opacity-60 transition-opacity duration-700 hover:opacity-70 hover:scale-105 transform"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/10"></div>
               </div>

               <div className="relative z-10 p-6 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-black text-white leading-tight drop-shadow-lg">{selectedPackage.name}</h2>
                        <button className="p-2 -mr-2 -mt-2 text-slate-300 hover:text-white transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <p className="text-sm text-slate-200 font-medium leading-relaxed drop-shadow-md pr-4">
                        {selectedPackage.description}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                        <div className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                            {selectedPackage.duration}
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-blue-600/80 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-blue-900/20">
                            {selectedPackage.tagline}
                        </div>
                    </div>
               </div>
           </div>

           <ItinerarySidebar 
             days={selectedPackage.days} 
             selectedDayNumber={selectedDay.dayNumber}
             onSelectDay={handleDaySelect}
             onBookHotel={handleBookHotel}
             activePoiId={activePoiId}
             onPoiSelect={handlePoiSelect}
             showHacks={showHacks}
             onBookFlight={handleBookFlight}
             selectedFlights={selectedFlights}
             isEditable={isEditable}
             onAddPoi={handleOpenAddPoiModal}
             onAddDay={handleAddDay}
           />
           
           <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl z-20 transition-colors">
              <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                    <Calculator className="w-3 h-3" />
                    Estimated Total
                 </div>
                 <div className="text-xs text-slate-500">Includes Hotels & Flights</div>
              </div>
              <div className="flex justify-between items-end">
                 <div className="flex flex-col">
                    <span className="text-2xl font-black text-slate-900 dark:text-white flex items-start gap-0.5">
                       <span className="text-base font-medium mt-1 text-slate-400">$</span>
                       {totalPrice.toLocaleString()}
                    </span>
                 </div>
                 <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20">
                    <CreditCard className="w-4 h-4" />
                    Confirm Package
                 </button>
              </div>
           </div>
        </div>

        <div className={`
            flex-1 bg-slate-100 dark:bg-slate-800 relative transition-colors
            ${mobileView === 'map' && viewMode !== 'splash' ? 'block' : 'hidden md:block'}
        `}>
          <MapDisplay 
            selectedDay={selectedDay} 
            allDays={selectedPackage.days}
            onBookHotel={handleBookHotel}
            onSelectDay={handleDaySelect}
            isDarkMode={isDarkMode}
            activePoiId={activePoiId || undefined}
            onPoiSelect={handlePoiSelect}
            flyToFlight={activeBookedFlight}
            hotelFlyAnimation={hotelFlyTo}
          />
        </div>

        {viewMode !== 'splash' && (
            <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                <button 
                    onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
                    className="flex items-center gap-2 bg-slate-900/90 dark:bg-slate-800/90 text-white px-6 py-3 rounded-full shadow-2xl border border-slate-700 backdrop-blur-md font-bold text-sm hover:scale-105 transition-transform"
                >
                    {mobileView === 'list' ? (
                        <><MapIcon className="w-4 h-4 text-blue-400" /> View Map</>
                    ) : (
                        <><List className="w-4 h-4 text-blue-400" /> View Itinerary</>
                    )}
                </button>
            </div>
        )}
      </div>

      {viewMode !== 'splash' && <ChatWidget currentPackage={selectedPackage} />}

      <HotelSearchModal 
        isOpen={isHotelModalOpen}
        onClose={() => setIsHotelModalOpen(false)}
        location={hotelSearchLocation}
        locationName={hotelSearchName}
        targetDate={hotelSearchDate}
        onBookHotel={handleHotelBookingConfirmed}
      />
      
      <FlightSearchModal
        isOpen={isFlightModalOpen}
        onClose={() => setIsFlightModalOpen(false)}
        arrivalCity={flightCity}
        targetDate={flightTargetDate}
        defaultReturnDate={flightReturnDate}
        mode={flightMode}
        onSelect={handleFlightSelect}
        onArrivalCityChange={isEditable ? setFlightCity : undefined}
      />

      <PoiSearchModal 
        isOpen={isPoiModalOpen}
        onClose={() => setIsPoiModalOpen(false)}
        type={poiSearchType}
        onSelect={handleAddPoi}
      />
    </div>
  );
};

export default App;
