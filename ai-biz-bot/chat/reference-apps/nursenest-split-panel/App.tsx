

import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, PanelRightClose, PanelRightOpen, Plane, Mic, MicOff, LogIn, User as UserIcon, BedDouble, PhoneCall, Smartphone, CheckCircle, RotateCcw, Save } from 'lucide-react';
import { ChatBubble } from './components/ChatBubble';
import { ItineraryCanvas } from './components/ItineraryCanvas';
import { BookingModal } from './components/BookingModal';
import { HotelSearchModal } from './components/HotelSearchModal';
import { LiveAgentModal } from './components/LiveAgentModal';
import { PhoneVerificationModal } from './components/PhoneVerificationModal';
import { sendMessageToGemini } from './services/gemini';
import { Coordinates, Message, Booking, TripFocus, GoogleUser, GoogleAuthToken, TripBudget, Task } from './types';

// IMPORTANT: Replace this with your actual Client ID from Google Cloud Console.
// The provided Service Account ID cannot be used here for security reasons.
// You must create an "OAuth 2.0 Client ID" for "Web Application".
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; 

const STORAGE_KEY = 'nursenest_app_data_v1';

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm your NurseNest coordinator. I can help you find extended stay housing near your hospital assignment. Where are you headed?",
      timestamp: Date.now(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  
  // Voice Input State (Speech-to-Text)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Live Voice Agent State (Gemini Live)
  const [isLiveAgentOpen, setIsLiveAgentOpen] = useState(false);
  
  // Canvas & Trip State
  const [canvasContent, setCanvasContent] = useState<string>('');
  const [isCanvasOpen, setIsCanvasOpen] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tripFocus, setTripFocus] = useState<TripFocus | null>(null);
  const [tripTasks, setTripTasks] = useState<Task[]>([]);
  
  // Budget State
  const [tripBudget, setTripBudget] = useState<TripBudget>({
      limit: 4000, // Default monthly budget
      expenses: []
  });

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<{title?: string, uri?: string}>({});

  // Hotel Search State
  const [isHotelSearchOpen, setIsHotelSearchOpen] = useState(false);

  // Google Auth State
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [authToken, setAuthToken] = useState<GoogleAuthToken | null>(null);

  // Phone Verification State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string | null>(null);
  
  // Data Persistence State
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  // Auto-scroll chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Data on Mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            if (data.messages) setMessages(data.messages);
            if (data.canvasContent) setCanvasContent(data.canvasContent);
            if (data.bookings) setBookings(data.bookings);
            if (data.tripFocus) setTripFocus(data.tripFocus);
            if (data.tripBudget) setTripBudget(data.tripBudget);
            if (data.tripTasks) setTripTasks(data.tripTasks);
            if (data.userPhoneNumber) setUserPhoneNumber(data.userPhoneNumber);
            console.log("Data loaded from local storage");
        } catch (e) {
            console.error("Failed to load saved data", e);
        }
    }
    setIsDataLoaded(true);
  }, []);

  // Save Data on Change
  useEffect(() => {
    if (!isDataLoaded) return;

    const timeoutId = setTimeout(() => {
        const dataToSave = {
            messages,
            canvasContent,
            bookings,
            tripFocus,
            tripBudget,
            tripTasks,
            userPhoneNumber
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        setLastSaved(Date.now());
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timeoutId);
  }, [messages, canvasContent, bookings, tripFocus, tripBudget, tripTasks, userPhoneNumber, isDataLoaded]);

  useEffect(() => {
    // Request Geolocation on mount
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log("Geolocation permission denied or error:", error);
        }
      );
    }
    
    // Initialize Speech Recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    }

    // Initialize Google Identity Services
    const initGSI = () => {
        if ((window as any).google && (window as any).google.accounts) {
            // 1. Initialize Token Client (for calling APIs)
            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/gmail.send',
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        setAuthToken(tokenResponse);
                        // Once we have a token, we can also fetch basic profile info
                        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                        })
                        .then(res => res.json())
                        .then(data => setGoogleUser(data))
                        .catch(console.error);
                    }
                },
            });
            setTokenClient(client);
        } else {
            // Retry if script hasn't loaded
            setTimeout(initGSI, 500);
        }
    };
    initGSI();

  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleLogin = () => {
      if (tokenClient) {
          tokenClient.requestAccessToken();
      } else {
          alert("Google Sign-In is initializing. Please try again in a moment.");
      }
  };

  const handleNewTrip = () => {
      if (window.confirm("Start a new trip? This will clear your current chat, itinerary, tasks, and budget.")) {
          localStorage.removeItem(STORAGE_KEY);
          window.location.reload();
      }
  };

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    const textToSend = textOverride ?? inputText;
    
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    if (!textOverride) {
        setInputText('');
    }
    
    setIsLoading(true);

    try {
        const history = [...messages, userMessage];
        // Pass tripFocus and userPhoneNumber to the service
        const result = await sendMessageToGemini(history, userLocation, tripFocus, userPhoneNumber);
        
        const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: result.text,
            timestamp: Date.now(),
            groundingMetadata: result.groundingMetadata
        };
        
        setMessages(prev => [...prev, botMessage]);
    } catch (err) {
        console.error(err);
        const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "Sorry, I encountered a connection error. Please try again.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  const toggleListening = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!recognitionRef.current) {
          alert("Voice input is not supported in this browser.");
          return;
      }

      if (isListening) {
          recognitionRef.current.stop();
      } else {
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

  const addToCanvas = (text: string) => {
      setCanvasContent(prev => {
          // Smart grouping: If we are adding a candidate/checklist item, ensure there is a header
          if (text.startsWith('- [ ]')) {
              const header = "\n\n### 🏨 Housing Options to Compare\n";
              const existingHeader = "### 🏨 Housing Options to Compare";
              
              if (!prev.includes(existingHeader)) {
                  // Append header then item
                  const prefix = prev ? '\n' : '';
                  return prev + prefix + header + text;
              } else {
                  // Header exists, append item (simple append for now, could be smarter to find section but text is unstructured)
                  return prev + '\n' + text;
              }
          }

          const prefix = prev ? '\n' : '';
          return prev + prefix + text;
      });
      if (window.innerWidth < 768) {
          setIsCanvasOpen(true);
      }
  };

  const handleOpenBooking = (title?: string, uri?: string) => {
      setPendingBookingData({ title, uri });
      setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = (bookingData: any) => {
      const newBooking: Booking = {
          id: Date.now().toString(),
          status: 'confirmed',
          ...bookingData
      };
      setBookings(prev => [newBooking, ...prev]);
      setIsCanvasOpen(true);
  };
  
  const handleSetAnchor = (title: string, uri: string) => {
      setTripFocus({
          id: Date.now().toString(),
          name: title,
          uri: uri,
          location: '', 
          type: 'work', // Changed default to work
          transportMode: 'driving' // Default
      });
      setIsCanvasOpen(true);
  };

  const onHotelSearch = (params: { 
      location: string; 
      checkIn: string; 
      checkOut: string; 
      guests: number;
      housingTypes: string[];
      budget?: { amount: string; frequency: string };
  }) => {
      const housingStr = params.housingTypes.length > 0 
          ? params.housingTypes.map(t => t.replace('_', ' ')).join(' or ')
          : 'extended stay hotels';
          
      let query = `Find top rated ${housingStr} in ${params.location} for ${params.guests} guests from ${params.checkIn} to ${params.checkOut}. `;
      
      if (params.budget && params.budget.amount) {
          query += `My budget is $${params.budget.amount} ${params.budget.frequency}. `;
      }
      
      query += `Focus on safety, quietness, and proximity to hospitals.`;
      
      handleSendMessage(undefined, query);
  };

  const handleVerifyPhone = (phone: string) => {
      setUserPhoneNumber(phone);
      // In a real app, you would send this to your backend to link the phone to the session
      console.log("Phone linked:", phone);
      // Optional: Send a system message to the chat
      const sysMsg: Message = {
          id: Date.now().toString(),
          role: 'model',
          text: `Thanks! I've linked your phone number (${phone}). If you call our support line, I'll have your itinerary ready.`,
          timestamp: Date.now()
      };
      setMessages(prev => [...prev, sysMsg]);
  };

  return (
    <div className="flex h-full w-full bg-slate-50 relative">
      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)}
        initialTitle={pendingBookingData.title}
        initialUri={pendingBookingData.uri}
        onConfirm={handleConfirmBooking}
      />
      
      <HotelSearchModal 
        isOpen={isHotelSearchOpen} 
        onClose={() => setIsHotelSearchOpen(false)} 
        onSearch={onHotelSearch}
      />
      
      <LiveAgentModal 
        isOpen={isLiveAgentOpen}
        onClose={() => setIsLiveAgentOpen(false)}
        userPhoneNumber={userPhoneNumber}
      />

      <PhoneVerificationModal 
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onVerify={handleVerifyPhone}
      />

      {/* Left Panel: Chat Interface */}
      <div className={`flex flex-col h-full transition-all duration-300 ${isCanvasOpen ? 'w-full md:w-1/2 lg:w-[55%]' : 'w-full'}`}>
        
        {/* Header */}
        <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                    <Plane size={24} />
                </div>
                <div>
                    <h1 className="font-bold text-xl text-slate-800 tracking-tight">NurseNest</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                         {lastSaved && (
                             <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                 <Save size={10} /> Saved
                             </span>
                         )}
                         {userLocation ? (
                            <><MapPin size={10} className="text-emerald-500" /> <span>Local</span></>
                        ) : (
                            <><MapPin size={10} className="text-slate-400" /> <span>Local</span></>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleNewTrip}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:text-red-600 text-slate-600 rounded-full text-xs font-medium transition-colors"
                    title="Start New Trip (Clear Data)"
                >
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline">New Trip</span>
                </button>

                {/* Voice Agent Button */}
                <button 
                    onClick={() => setIsLiveAgentOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-medium transition-colors shadow-sm animate-pulse"
                    title="Speak with NurseNest Agent"
                >
                    <PhoneCall size={14} />
                    <span className="hidden sm:inline">Call Agent</span>
                </button>

                {/* Phone Verification Button */}
                {userPhoneNumber ? (
                     <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium" title={`Linked: ${userPhoneNumber}`}>
                        <CheckCircle size={12} />
                        <span className="hidden sm:inline">Linked</span>
                     </div>
                ) : (
                    <button 
                        onClick={() => setIsPhoneModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-medium transition-colors"
                        title="Link Phone Number"
                    >
                        <Smartphone size={14} />
                        <span className="hidden sm:inline">Link Phone</span>
                    </button>
                )}

                {/* Auth Button */}
                {googleUser ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
                        {googleUser.picture ? (
                            <img src={googleUser.picture} alt="User" className="w-6 h-6 rounded-full" />
                        ) : (
                            <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
                                {googleUser.name.charAt(0)}
                            </div>
                        )}
                        <span className="text-xs font-medium text-slate-700 hidden sm:inline">{googleUser.name}</span>
                    </div>
                ) : (
                    <button 
                        onClick={handleLogin}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-medium transition-colors"
                        title="Sign in with Google"
                    >
                        <LogIn size={14} />
                        <span className="hidden sm:inline">Sign In</span>
                    </button>
                )}

                <button 
                    onClick={() => setIsCanvasOpen(!isCanvasOpen)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden"
                >
                    {isCanvasOpen ? <PanelRightClose /> : <PanelRightOpen />}
                </button>
            </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
            {messages.map(msg => (
                <ChatBubble 
                    key={msg.id} 
                    message={msg} 
                    onAddToCanvas={addToCanvas}
                    onBook={handleOpenBooking}
                    onSetAnchor={handleSetAnchor}
                />
            ))}
            {isLoading && (
                 <div className="flex justify-start w-full mb-6">
                    <div className="flex max-w-[80%] gap-3 flex-row">
                         <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Plane size={14} className="animate-pulse" />
                        </div>
                        <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm">
                            <span className="text-slate-400 text-sm">Searching housing options...</span>
                        </div>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-200">
            <form 
                onSubmit={(e) => handleSendMessage(e)}
                className="relative flex items-center max-w-4xl mx-auto"
            >
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Find housing near my hospital..."}
                    className={`w-full bg-slate-100 text-slate-800 placeholder-slate-400 rounded-full py-4 pl-6 pr-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner ${isListening ? 'ring-2 ring-red-400 bg-red-50' : ''}`}
                    disabled={isLoading}
                />
                
                <div className="absolute right-2 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setIsHotelSearchOpen(true)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 rounded-full transition-colors"
                        title="Search Housing"
                    >
                        <BedDouble size={20} />
                    </button>

                    <button
                        onClick={toggleListening}
                        type="button"
                        className={`p-2 rounded-full transition-colors ${
                            isListening 
                            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200'
                        }`}
                        title={isListening ? "Stop Listening" : "Voice Input"}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <button 
                        type="submit"
                        disabled={!inputText.trim() || isLoading}
                        className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
            <p className="text-center text-xs text-slate-400 mt-2">
                NurseNest AI • Powered by Gemini 2.5 Flash
            </p>
        </div>
      </div>

      {/* Right Panel: Canvas */}
      <div className={`fixed inset-y-0 right-0 w-full md:static md:h-full transition-transform duration-300 ease-in-out z-30 ${
          isCanvasOpen 
          ? 'translate-x-0 md:w-1/2 lg:w-[45%]' 
          : 'translate-x-full md:w-0 md:translate-x-0'
      }`}>
         <div className="h-full w-full relative">
            <ItineraryCanvas 
                content={canvasContent} 
                onChange={setCanvasContent} 
                bookings={bookings}
                tripFocus={tripFocus}
                tripBudget={tripBudget}
                tripTasks={tripTasks}
                onUpdateTasks={setTripTasks}
                onUpdateBudget={setTripBudget}
                onSetTripFocus={setTripFocus}
                onManualBooking={() => handleOpenBooking()}
                googleToken={authToken}
                onLoginRequest={handleLogin}
            />
            
            {!isCanvasOpen && (
                 <button 
                    onClick={() => setIsCanvasOpen(true)}
                    className="hidden md:flex absolute top-1/2 -left-12 bg-white border border-slate-200 p-2 rounded-l-xl shadow-md text-slate-500 hover:text-indigo-600"
                >
                    <PanelRightOpen />
                </button>
            )}
            
            <button
                onClick={() => setIsCanvasOpen(false)}
                className="md:hidden absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 z-50"
            >
                <PanelRightClose size={20} />
            </button>
         </div>
      </div>

    </div>
  );
}

export default App;