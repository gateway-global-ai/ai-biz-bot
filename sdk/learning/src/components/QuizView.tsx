import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface Props {
  questions: QuizQuestion[];
  onClose: () => void;
}

const QuizView: React.FC<Props> = ({ questions, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    
    if (index === currentQuestion.correctAnswerIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowSummary(true);
    }
  };

  if (showSummary) {
    const percentage = Math.round((score / questions.length) * 100);
    let grade = "";
    if (percentage >= 90) grade = "S-CLASS";
    else if (percentage >= 80) grade = "A-RANK";
    else if (percentage >= 60) grade = "B-RANK";
    else grade = "RE-TRAINING REQUIRED";

    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center animate-[fadeIn_0.5s_ease-out]">
         <div className="bg-slate-900/90 border border-cyan-500/30 p-10 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] max-w-md w-full relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none"></div>
            
            <h2 className="text-3xl font-mono font-bold text-white mb-2 tracking-widest uppercase">Assessment Complete</h2>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent my-6"></div>
            
            <div className="mb-6">
               <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 font-mono block mb-2">
                 {percentage}%
               </span>
               <span className={`text-sm font-mono tracking-[0.3em] px-3 py-1 rounded border ${percentage >= 60 ? 'border-green-500/50 text-green-400 bg-green-900/20' : 'border-red-500/50 text-red-400 bg-red-900/20'}`}>
                 {grade}
               </span>
            </div>

            <p className="text-slate-400 text-sm mb-8">
              Correct Answers: <span className="text-white">{score}</span> / <span className="text-white">{questions.length}</span>
            </p>

            <button 
              onClick={onClose}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-mono tracking-widest uppercase rounded transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              Return to Nexus
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full w-full p-4 md:p-8 animate-[fadeIn_0.3s_ease-out]">
      <div className="w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/20 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
         {/* Header */}
         <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/20">
           <div className="flex items-center gap-3">
             <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 font-mono text-sm">
               {currentIndex + 1}
             </span>
             <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Question {currentIndex + 1} of {questions.length}</span>
           </div>
           <div className="flex gap-1">
             {questions.map((_, idx) => (
                <div key={idx} className={`h-1.5 w-6 rounded-full transition-colors ${idx <= currentIndex ? (idx < currentIndex ? 'bg-cyan-500' : 'bg-white') : 'bg-slate-700'}`}></div>
             ))}
           </div>
         </div>

         {/* Content */}
         <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
           <h3 className="text-xl md:text-2xl font-light text-white leading-relaxed mb-8">
             {currentQuestion.question}
           </h3>

           <div className="grid gap-3">
             {currentQuestion.options.map((option, idx) => {
               let stateClass = "bg-slate-800/50 border-white/5 hover:bg-slate-800 hover:border-white/20 text-slate-300";
               
               if (isAnswered) {
                 if (idx === currentQuestion.correctAnswerIndex) {
                   stateClass = "bg-green-900/30 border-green-500/50 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
                 } else if (idx === selectedOption) {
                   stateClass = "bg-red-900/30 border-red-500/50 text-red-100";
                 } else {
                   stateClass = "bg-slate-900/30 border-transparent text-slate-500 opacity-50";
                 }
               } else if (selectedOption === idx) {
                 stateClass = "bg-cyan-900/40 border-cyan-500 text-cyan-100";
               }

               return (
                 <button 
                   key={idx}
                   onClick={() => handleOptionClick(idx)}
                   disabled={isAnswered}
                   className={`w-full text-left p-4 rounded-lg border transition-all duration-200 flex items-start gap-4 group ${stateClass}`}
                 >
                   <span className={`font-mono text-xs mt-1 px-2 py-0.5 rounded border ${isAnswered && idx === currentQuestion.correctAnswerIndex ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-white/10 bg-white/5 text-slate-400 group-hover:bg-white/10'}`}>
                     {String.fromCharCode(65 + idx)}
                   </span>
                   <span className="text-sm md:text-base leading-relaxed">{option}</span>
                   {isAnswered && idx === currentQuestion.correctAnswerIndex && (
                     <svg className="w-5 h-5 ml-auto text-green-400 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   )}
                   {isAnswered && idx === selectedOption && idx !== currentQuestion.correctAnswerIndex && (
                     <svg className="w-5 h-5 ml-auto text-red-400 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   )}
                 </button>
               );
             })}
           </div>

           {/* Feedback Area */}
           {isAnswered && (
             <div className={`mt-6 p-4 rounded border ${selectedOption === currentQuestion.correctAnswerIndex ? 'bg-green-900/10 border-green-500/20' : 'bg-cyan-900/10 border-cyan-500/20'} animate-[fadeIn_0.3s_ease-out]`}>
               <div className="flex items-center gap-2 mb-2">
                 <span className={`text-xs font-bold uppercase tracking-wider ${selectedOption === currentQuestion.correctAnswerIndex ? 'text-green-400' : 'text-cyan-400'}`}>
                    {selectedOption === currentQuestion.correctAnswerIndex ? 'Correct' : 'Insight'}
                 </span>
               </div>
               <p className="text-sm text-slate-300 leading-relaxed">
                 {currentQuestion.explanation}
               </p>
             </div>
           )}
         </div>

         {/* Footer */}
         <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end">
           <button
             onClick={handleNext}
             disabled={!isAnswered}
             className="px-8 py-3 bg-white text-black font-bold font-mono tracking-widest uppercase rounded hover:bg-cyan-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
           >
             {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
           </button>
         </div>
      </div>
    </div>
  );
};

export default QuizView;