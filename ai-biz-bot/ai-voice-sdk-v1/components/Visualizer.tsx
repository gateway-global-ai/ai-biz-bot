import React from 'react';
import { VisualizerType } from '../types';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
  type: VisualizerType;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive, type }) => {
  if (type === 'orb') {
     return (
       <div className="flex items-center justify-center h-24 w-full my-4">
         <div 
           className={`rounded-full transition-all duration-75 ${isActive ? 'bg-cyan-500 shadow-[0_0_40px_rgba(34,211,238,0.6)]' : 'bg-gray-800'}`}
           style={{
             width: `${isActive ? Math.max(30, volume * 150) : 30}px`,
             height: `${isActive ? Math.max(30, volume * 150) : 30}px`,
             opacity: isActive ? 0.8 + Math.random() * 0.2 : 0.3
           }}
         />
       </div>
     );
  }

  if (type === 'wave') {
    return (
      <div className="flex items-center justify-center gap-1 h-16 w-full my-4">
        {Array.from({ length: 16 }).map((_, i) => {
           // Create a wave effect from center
           const center = 8;
           const dist = Math.abs(center - i);
           const waveFactor = Math.cos(dist * 0.3 - Date.now() / 200);
           const height = isActive 
             ? Math.max(15, (volume * 100) * (1 + waveFactor)) 
             : 10;
             
           return (
             <div 
               key={i}
               className={`w-1.5 rounded-full transition-all duration-75 ${isActive ? 'bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]' : 'bg-gray-700'}`}
               style={{ height: `${Math.min(100, height)}%` }}
             />
           )
        })}
      </div>
    )
  }

  // Default Bars
  const bars = Array.from({ length: 5 });
  return (
    <div className="flex items-end justify-center gap-1 h-16 w-32 my-4">
      {bars.map((_, i) => {
        const offset = Math.sin(Date.now() / 200 + i); 
        const heightPercent = isActive 
          ? Math.max(10, Math.min(100, (volume * 100) * (1 + offset * 0.2) + (Math.random() * 20))) 
          : 10;
          
        return (
          <div
            key={i}
            className={`w-4 rounded-t-sm transition-all duration-75 ${isActive ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'bg-gray-700'}`}
            style={{ height: `${heightPercent}%` }}
          />
        );
      })}
    </div>
  );
};

export default Visualizer;