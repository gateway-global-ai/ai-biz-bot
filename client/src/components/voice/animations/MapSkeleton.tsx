import React from 'react';

export const MapSkeleton = () => {
  return (
    <div className="w-full h-full p-4 space-y-4 animate-fade-in">
      {/* Map Placeholder */}
      <div className="w-full h-32 bg-gray-200 rounded-xl overflow-hidden relative">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" 
          style={{ transform: 'skewX(-20deg)' }} 
        />
      </div>

      {/* Title Placeholder */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded-md w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded-md w-1/2 animate-pulse" />
      </div>

      {/* Rating Placeholder */}
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-4 h-4 bg-gray-100 rounded-full animate-pulse" />
        ))}
      </div>
    </div>
  );
};
