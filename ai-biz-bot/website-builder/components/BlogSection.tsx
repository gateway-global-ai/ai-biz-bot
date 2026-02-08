import React, { useState, useEffect, useRef } from 'react';
import { NearbyPlace } from '../types';

interface Props {
  restaurants: NearbyPlace[];
  activities: NearbyPlace[];
}

type TabType = 'dining' | 'activities';

const BlogSection: React.FC<Props> = ({ restaurants, activities }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dining');
  const [itemsWithPhotos, setItemsWithPhotos] = useState<Record<string, NearbyPlace[]>>({
    dining: restaurants,
    activities: activities
  });

  // Reference to the PlacesService
  const placesServiceRef = useRef<any>(null);

  useEffect(() => {
    // Initialize PlacesService if Google Maps script is loaded
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places && !placesServiceRef.current) {
      const mapDiv = document.createElement('div');
      placesServiceRef.current = new (window as any).google.maps.places.PlacesService(mapDiv);
    }
  }, []);

  // Effect to fetch photos for items that don't have them yet
  useEffect(() => {
    const fetchPhotos = (items: NearbyPlace[], category: TabType) => {
      if (!placesServiceRef.current) return;

      const updatedItems = [...items];
      let hasUpdates = false;

      updatedItems.forEach((place, index) => {
        // Skip if we already have a real photo or if we've already tried fetching (marked by a specific placeholder if needed, but here check for google url)
        if (place.imageUrl && place.imageUrl.includes('googleusercontent')) return;

        const request = {
          query: `${place.name} ${place.location}`,
          fields: ['photos', 'name']
        };

        placesServiceRef.current.findPlaceFromQuery(request, (results: any[], status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
            const photoUrl = results[0].photos?.[0]?.getUrl({ maxWidth: 600, maxHeight: 400 });
            if (photoUrl) {
               // Update the item in the local state copy
               setItemsWithPhotos(prev => {
                 const newList = [...prev[category]];
                 newList[index] = { ...newList[index], imageUrl: photoUrl };
                 return { ...prev, [category]: newList };
               });
            }
          }
        });
      });
    };

    if (activeTab === 'dining') {
      fetchPhotos(restaurants, 'dining');
    } else {
      fetchPhotos(activities, 'activities');
    }
  }, [activeTab, restaurants, activities]);

  // Use the items from state which might have updated photos, fallback to props
  const currentItems = itemsWithPhotos[activeTab] || (activeTab === 'dining' ? restaurants : activities);

  if (!currentItems || currentItems.length === 0) return null;

  return (
    <section className="py-20 bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <span className="text-blue-600 font-semibold tracking-wider text-sm uppercase">Neighborhood Guide</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">Explore the Area</h2>
          <p className="text-slate-500 mt-4 max-w-2xl mx-auto">
            Discover the best spots around town, curated just for you.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-1 rounded-full border border-slate-200 shadow-sm inline-flex">
            <button
              onClick={() => setActiveTab('dining')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === 'dining' 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Top Restaurants
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === 'activities' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Nearby Activities
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8 fade-in duration-500 key={activeTab}">
          {currentItems.map((place, index) => (
            <div 
              key={`${activeTab}-${index}`} 
              className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300 group flex flex-col h-full"
            >
              {/* Image Header */}
              <div className="relative h-56 overflow-hidden bg-slate-200">
                {place.imageUrl ? (
                  <img 
                    src={place.imageUrl} 
                    alt={place.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <img 
                    src={`https://source.unsplash.com/600x400/?${activeTab === 'dining' ? 'food,restaurant' : 'park,museum'},${place.type.split(' ')[0]}`}
                    alt={place.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80"
                  />
                )}
                
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-900 uppercase tracking-wide shadow-sm">
                  {place.type}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {place.name}
                  </h3>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-500">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-bold text-amber-900">{place.rating}</span>
                  </div>
                </div>

                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                  {place.summary}
                </p>

                <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 truncate max-w-[60%]">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 shrink-0">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                       <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                     </svg>
                     <span className="truncate">{place.location}</span>
                  </span>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + (activeTab === 'dining' ? 'restaurant' : 'activity'))}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-600 font-medium hover:underline shrink-0"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;