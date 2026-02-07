import React, { useState, useCallback, useRef, useMemo } from 'react';
import { ViewState, BusinessData } from './types';
import { enrichBusinessData, createChatSession } from './services/geminiService';
import { LiveVoiceClient } from './services/liveService';
import HeroSection from './components/HeroSection';
import InfoGrid from './components/InfoGrid';
import BlogSection from './components/BlogSection';
import ChatWidget from './components/ChatWidget';
import VoiceIndicator from './components/VoiceIndicator';
import PlaceSearch from './components/PlaceSearch';
import AdminPanel from './components/AdminPanel';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LANDING);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatWelcomeMessage, setChatWelcomeMessage] = useState<string>('Hi there! I can help you with store hours, products, or directions. Ask me anything!');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  
  // Admin State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [ignoredFields, setIgnoredFields] = useState<Set<string>>(new Set());
  const [hiddenReviews, setHiddenReviews] = useState<Set<number>>(new Set());
  const [minRating, setMinRating] = useState<number>(3); // Default min rating

  const voiceClient = useRef(new LiveVoiceClient());

  const handlePlaceSelect = async (place: any) => {
    setViewState(ViewState.LOADING);
    try {
      const data = await enrichBusinessData(place);
      setBusinessData(data);
      
      // Initialize Chat (Customer Facing)
      const session = await createChatSession(data);
      setChatSession(session);
      setChatWelcomeMessage('Hi there! I can help you with store hours, products, or directions. Ask me anything!');
      
      setViewState(ViewState.GENERATED);
    } catch (error) {
      console.error(error);
      setViewState(ViewState.ERROR);
    }
  };

  const toggleVoice = useCallback(async () => {
    if (isVoiceActive) {
      voiceClient.current.disconnect();
      setIsVoiceActive(false);
    } else if (businessData) {
      voiceClient.current.onVolumeChange = setVoiceVolume;
      try {
        await voiceClient.current.connect(businessData);
        setIsVoiceActive(true);
      } catch (e) {
        console.error("Failed to connect voice", e);
        alert("Microphone access is needed for voice concierge.");
      }
    }
  }, [isVoiceActive, businessData]);

  const handleReset = () => {
    setViewState(ViewState.LANDING);
    setBusinessData(null);
    setChatSession(null);
    setIsChatOpen(false);
    setIsVoiceActive(false);
    setIsAdminOpen(false);
    setIgnoredFields(new Set());
    setHiddenReviews(new Set());
    setMinRating(3);
    voiceClient.current.disconnect();
  };

  const toggleIgnoredField = (field: string) => {
    setIgnoredFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const toggleHiddenReview = (index: number) => {
    setHiddenReviews(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Filter reviews based on admin settings
  const filteredReviews = useMemo(() => {
    if (!businessData) return [];
    return businessData.reviews.filter((review, index) => {
      if (hiddenReviews.has(index)) return false;
      if (review.rating < minRating) return false;
      return true;
    });
  }, [businessData, hiddenReviews, minRating]);

  if (viewState === ViewState.LANDING || viewState === ViewState.LOADING || viewState === ViewState.ERROR) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        
        <div className="z-10 w-full max-w-2xl px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              AI Business Site Generator
            </h1>
            <p className="text-lg text-slate-600">
              Lookup your business to generate a modern, interactive website with real-time AI assistance.
            </p>
          </div>

          <PlaceSearch 
            onPlaceSelect={handlePlaceSelect} 
            isLoading={viewState === ViewState.LOADING} 
          />

          {viewState === ViewState.ERROR && (
            <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="font-semibold">Generation failed</p>
                <p className="text-sm">We couldn't process that business. Please try again.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Generated View
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 animate-in fade-in duration-500">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={handleReset} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="font-bold text-xl tracking-tight text-slate-900">
            {businessData?.name}
          </div>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => setIsAdminOpen(true)}
             className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2 border border-slate-200 rounded-full hover:bg-slate-50"
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
               <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
             </svg>
             Admin
           </button>
           
           <button 
             onClick={toggleVoice}
             className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-lg ${isVoiceActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
               {isVoiceActive ? (
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               ) : (
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
               )}
             </svg>
             {isVoiceActive ? 'End Call' : 'Concierge'}
           </button>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {businessData && (
          <>
            <HeroSection 
              data={businessData} 
              onVoiceToggle={toggleVoice} 
              onChatClick={() => setIsChatOpen(true)}
              isVoiceActive={isVoiceActive} 
              voiceVolume={voiceVolume} 
            />
            <InfoGrid 
              data={businessData} 
              ignoredFields={ignoredFields}
              filteredReviews={filteredReviews}
            />
            <BlogSection 
              restaurants={businessData.nearbyRestaurants} 
              activities={businessData.nearbyActivities}
            />
            
            <div className="max-w-7xl mx-auto px-6 py-12 mb-20 text-center border-t border-slate-200">
              <p className="text-slate-400 text-sm">
                Generated with Gemini 2.5 • Data provided by Google Maps • <a href={businessData.mapLink} target="_blank" rel="noreferrer" className="underline hover:text-slate-600">View on Maps</a>
              </p>
            </div>
          </>
        )}
      </main>

      {/* Admin Panel */}
      {isAdminOpen && businessData && (
        <AdminPanel 
          data={businessData.rawPlaceData}
          reviews={businessData.reviews}
          ignoredFields={ignoredFields}
          hiddenReviews={hiddenReviews}
          minRating={minRating}
          onToggleField={toggleIgnoredField}
          onToggleReview={toggleHiddenReview}
          onSetMinRating={setMinRating}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

      {/* Chat Widget */}
      <ChatWidget 
        chatSession={chatSession} 
        isOpen={isChatOpen} 
        welcomeMessage={chatWelcomeMessage}
        onClose={() => setIsChatOpen(false)} 
      />
      
      {/* Floating Action Button (FAB) if Chat is closed */}
      {!isChatOpen && !isVoiceActive && !isAdminOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-500 transition-transform hover:scale-105 flex items-center justify-center z-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default App;