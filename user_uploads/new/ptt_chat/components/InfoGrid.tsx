import React from 'react';
import { BusinessData, Review } from '../types';

interface Props {
  data: BusinessData;
  ignoredFields: Set<string>;
  filteredReviews?: Review[];
}

const InfoGrid: React.FC<Props> = ({ data, ignoredFields, filteredReviews }) => {
  // Hard Filter: Only show reviews with 4 stars or higher
  const displayReviews = (filteredReviews || data.reviews).filter(r => r.rating >= 4);

  return (
    <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 auto-rows-min">
        
        {/* Card 1: Main Info / About (Spans 2 cols) */}
        <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                 </svg>
               </div>
               <h3 className="text-2xl font-bold text-slate-900">About Us</h3>
            </div>
            <p className="text-slate-600 text-lg leading-relaxed">{data.description}</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {data.insights.map((insight, i) => (
              <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-100">
                {insight}
              </span>
            ))}
          </div>
        </div>

        {/* Card 2: Hours (Spans 1 col) - HIDDEN if 'opening_hours' is ignored */}
        {!ignoredFields.has('opening_hours') && (
          <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-900/10 text-white flex flex-col">
            <div className="flex items-center gap-3 mb-6 text-white/90">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <h3 className="text-xl font-bold">Hours</h3>
            </div>
            <ul className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {data.hours.slice(0, 7).map((hour, i) => (
                <li key={i} className="flex justify-between text-sm text-slate-300 py-1 border-b border-white/5 last:border-0">
                  <span>{hour.split(': ')[0]}</span>
                  <span className="text-white font-medium">{hour.split(': ')[1] || 'Closed'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Card 3: Rating (Spans 1 col) - HIDDEN if 'rating' is ignored */}
        {!ignoredFields.has('rating') && (
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-8 rounded-[2rem] shadow-xl shadow-orange-500/20 text-white flex flex-col justify-center items-center text-center">
              <h3 className="text-6xl font-black mb-2">{data.rating.toFixed(1)}</h3>
              <div className="flex gap-1 mb-2 text-white">
                  {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`w-5 h-5 ${i < Math.round(data.rating) ? 'fill-current' : 'fill-white/30'}`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                  ))}
              </div>
              <span className="text-white/90 text-sm font-medium">{data.reviewCount} verified reviews</span>
          </div>
        )}

        {/* Card 4: Photo Gallery (Row 2, Spans 2 cols) - HIDDEN if 'photos' is ignored */}
        {!ignoredFields.has('photos') && (
          <div className="md:col-span-2 row-span-1 h-64 md:h-auto overflow-hidden rounded-[2rem] shadow-lg border border-slate-100 bg-slate-100 relative group">
             {data.images.length > 1 ? (
               <div className="grid grid-cols-2 h-full gap-1">
                  <div className="h-full overflow-hidden">
                      <img src={data.images[1]} alt="Gallery 1" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="grid grid-rows-2 gap-1 h-full">
                      {data.images[2] && (
                          <div className="overflow-hidden h-full">
                             <img src={data.images[2]} alt="Gallery 2" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          </div>
                      )}
                      {data.images[3] && (
                          <div className="overflow-hidden h-full">
                             <img src={data.images[3]} alt="Gallery 3" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          </div>
                      )}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-slate-900 shadow-lg">
                      See Gallery
                  </div>
               </div>
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                  <span>No gallery images available</span>
               </div>
             )}
          </div>
        )}

        {/* Card 5: Reviews (Row 2, Spans 2 cols) - HIDDEN if 'reviews' is ignored */}
        {!ignoredFields.has('reviews') && (
          <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="text-amber-500">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                   <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.405 0 4.802.173 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
                 </svg>
              </span>
              Top-Rated Feedback
            </h3>
            
            {displayReviews.length > 0 ? (
                <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                  {displayReviews.map((review, i) => (
                    <div key={i} className="flex gap-4 group">
                       <div className="shrink-0">
                           <img src={review.profile_photo_url} alt={review.author_name} className="w-10 h-10 rounded-full border border-slate-100" />
                       </div>
                       <div>
                           <div className="flex items-center gap-2 mb-1">
                               <span className="font-semibold text-sm text-slate-900">{review.author_name}</span>
                               <span className="text-amber-400 flex">
                                   {[...Array(5)].map((_, stars) => (
                                      <svg key={stars} className={`w-3 h-3 ${stars < Math.round(review.rating) ? 'fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                   ))}
                               </span>
                               <span className="text-xs text-slate-400">{review.relative_time_description}</span>
                           </div>
                           <p className="text-slate-600 text-sm leading-relaxed">
                             "{review.text}"
                           </p>
                       </div>
                    </div>
                  ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4">
                    <p className="text-sm">Only reviews with 4+ stars are displayed to maintain quality standards.</p>
                </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
               <a href={data.mapLink} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-semibold hover:underline">Read more on Google &rarr;</a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InfoGrid;