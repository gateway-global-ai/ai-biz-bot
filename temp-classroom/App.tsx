import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import ClassroomInterface from './components/ClassroomInterface';
import { AppView, LessonPlan } from './types';

function App() {
  const [view, setView] = useState<AppView>(AppView.CHAT);
  const [currentPlan, setCurrentPlan] = useState<LessonPlan | null>(null);

  const handleLessonReady = (plan: LessonPlan) => {
    setCurrentPlan(plan);
    setView(AppView.CLASSROOM);
  };

  const handleEndClass = () => {
    setCurrentPlan(null);
    setView(AppView.CHAT);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-cyan-500/30">
      {view === AppView.CHAT && (
        <ChatInterface onLessonReady={handleLessonReady} />
      )}
      
      {view === AppView.CLASSROOM && currentPlan && (
        <ClassroomInterface 
          plan={currentPlan} 
          onEndClass={handleEndClass} 
        />
      )}
    </div>
  );
}

export default App;