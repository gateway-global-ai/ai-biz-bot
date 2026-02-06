import { useState } from 'react';

interface PlaceData {
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_phone_number?: string;
  website?: string;
  place_id?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
  photos?: any[];
  reviews?: any[];
  types?: string[];
}

interface WebsitePreviewProps {
  place: PlaceData;
  onBack: () => void;
}

function getPhotoUrl(photo: any, maxWidth = 1200): string | null {
  if (!photo) return null;
  if (typeof photo.getURI === 'function') return photo.getURI({ maxWidth });
  if (typeof photo.getUrl === 'function') return photo.getUrl({ maxWidth });
  return null;
}

function generateTagline(place: PlaceData): string {
  const types = place.types || [];
  const city = place.formatted_address?.split(',').slice(-2, -1)[0]?.trim() || '';
  if (types.includes('restaurant') || types.includes('food')) {
    return `Your Favorite Dining Experience${city ? `, Right Here in ${city}` : ''}.`;
  }
  if (types.includes('store') || types.includes('shopping_mall')) {
    return `Quality Products & Service${city ? ` in ${city}` : ''}.`;
  }
  if (types.includes('health') || types.includes('doctor') || types.includes('dentist')) {
    return `Trusted Healthcare${city ? ` in ${city}` : ''}.`;
  }
  return `Serving Our Community${city ? ` in ${city}` : ''} with Excellence.`;
}

function generateDescription(place: PlaceData): string {
  const parts: string[] = [];
  parts.push(`Welcome to ${place.name}.`);
  if (place.rating) {
    parts.push(`Rated ${place.rating} out of 5 by ${place.user_ratings_total?.toLocaleString() || 'our'} customers,`);
    parts.push(`we're committed to providing the best experience.`);
  }
  if (place.formatted_address) {
    parts.push(`Visit us at ${place.formatted_address}.`);
  }
  if (place.formatted_phone_number) {
    parts.push(`Call us at ${place.formatted_phone_number} or use our AI assistant for instant support.`);
  }
  return parts.join(' ');
}

export default function WebsitePreview({ place, onBack }: WebsitePreviewProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const heroImage = place.photos && place.photos.length > 0 ? getPhotoUrl(place.photos[0]) : null;
  const galleryImages = (place.photos || []).slice(1, 4).map(p => getPhotoUrl(p, 600)).filter(Boolean) as string[];
  const tagline = generateTagline(place);
  const description = generateDescription(place);
  const mapLink = place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : '#';
  const reviews = place.reviews || [];
  const hours = place.opening_hours?.weekday_text || [];
  const types = (place.types || []).filter(t => !['point_of_interest', 'establishment'].includes(t)).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors" data-testid="button-preview-back">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="font-bold text-xl tracking-tight text-slate-900">
            {place.name}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAdminOpen(true)}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2 border border-slate-200 rounded-full hover:bg-slate-50"
            data-testid="button-preview-admin"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Admin
          </button>
          <button
            className="px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-lg bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
            data-testid="button-preview-concierge"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            Concierge
          </button>
        </div>
      </nav>

      <main>
        <div className="relative h-[85vh] min-h-[600px] w-full bg-slate-900 text-white overflow-hidden rounded-b-[4rem] shadow-2xl group">
          <div className="absolute inset-0 select-none">
            {heroImage ? (
              <img src={heroImage} alt={place.name} className="w-full h-full object-cover transition-transform duration-[2s] ease-out scale-105 group-hover:scale-110 opacity-60" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/60 to-slate-900" />
          </div>
          <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center z-10">
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-8 border border-white/20 backdrop-blur-md shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {tagline}
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 text-white drop-shadow-sm leading-tight">
                {place.name}
              </h1>
              <p className="text-lg md:text-xl text-slate-200/90 max-w-2xl mb-12 leading-relaxed font-light">
                {description}
              </p>
            </div>
            <div className="w-full mt-4 flex flex-col items-center">
              <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
                <button className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-full font-bold transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] active:scale-95" data-testid="button-preview-voice">
                  <span className="relative z-10 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600">
                      <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                      <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 9.364 1.5 1.5 0 01-3 0 6.751 6.751 0 01-6-9.364v-1.5a.75.75 0 01.75-.75z" />
                    </svg>
                    Voice Concierge
                  </span>
                </button>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-full font-semibold transition-all backdrop-blur-sm border border-white/10 hover:border-white/20"
                  data-testid="button-preview-chat"
                >
                  <span>Chat Concierge</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.355 0-2.697-.056-4.024-.166-1.137-.09-1.98-1.057-1.98-2.193v-4.286c0-.897.494-1.685 1.257-2.071m-6.429 1.256c.004-.326.244-.593.57-.615 1.355-.091 2.697-.167 4.024-.167 1.328 0 2.67.076 4.025.167.326.022.566.29.569.615v4.285c-.003.327-.243.594-.57.615-1.355.092-2.697.168-4.024.168-1.04 0-2.052-.046-3.045-.118H7.5v2.25l-2.25-2.25h-.75c-.327-.021-.567-.288-.569-.615V9.767z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 auto-rows-min">
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
                <p className="text-slate-600 text-lg leading-relaxed">{description}</p>
              </div>
              {types.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {types.map((t, i) => (
                    <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-100 capitalize">
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {hours.length > 0 && (
              <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-900/10 text-white flex flex-col">
                <div className="flex items-center gap-3 mb-6 text-white/90">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-bold">Hours</h3>
                </div>
                <ul className="space-y-3 flex-1 overflow-y-auto pr-2">
                  {hours.slice(0, 7).map((hour, i) => (
                    <li key={i} className="flex justify-between text-sm text-slate-300 py-1 border-b border-white/5 last:border-0">
                      <span>{hour.split(': ')[0]}</span>
                      <span className="text-white font-medium">{hour.split(': ')[1] || 'Closed'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {place.rating && (
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-8 rounded-[2rem] shadow-xl shadow-orange-500/20 text-white flex flex-col justify-center items-center text-center">
                <h3 className="text-6xl font-black mb-2">{place.rating.toFixed(1)}</h3>
                <div className="flex gap-1 mb-2 text-white">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-5 h-5 ${i < Math.round(place.rating!) ? 'fill-current' : 'fill-white/30'}`} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white/90 text-sm font-medium">{place.user_ratings_total?.toLocaleString() || '0'} verified reviews</span>
              </div>
            )}

            {galleryImages.length > 0 && (
              <div className="md:col-span-2 row-span-1 h-64 md:h-auto overflow-hidden rounded-[2rem] shadow-lg border border-slate-100 bg-slate-100 relative group">
                <div className={`grid ${galleryImages.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'} h-full gap-1`}>
                  <div className="h-full overflow-hidden">
                    <img src={galleryImages[0]} alt="Gallery 1" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  {galleryImages.length >= 2 && (
                    <div className={`grid ${galleryImages.length >= 3 ? 'grid-rows-2' : 'grid-rows-1'} gap-1 h-full`}>
                      <div className="overflow-hidden h-full">
                        <img src={galleryImages[1]} alt="Gallery 2" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      </div>
                      {galleryImages[2] && (
                        <div className="overflow-hidden h-full">
                          <img src={galleryImages[2]} alt="Gallery 3" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-slate-900 shadow-lg">
                    See Gallery
                  </div>
                </div>
              </div>
            )}

            {reviews.length > 0 && (
              <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="text-amber-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.405 0 4.802.173 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
                    </svg>
                  </span>
                  What People Say
                </h3>
                <div className="space-y-6 flex-1 overflow-y-auto pr-2 max-h-[300px]">
                  {reviews.slice(0, 5).map((review: any, i: number) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="shrink-0">
                        {review.profile_photo_url ? (
                          <img src={review.profile_photo_url} alt={review.author_name} className="w-10 h-10 rounded-full border border-slate-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold">
                            {(review.author_name || 'A').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-slate-900">{review.author_name}</span>
                          <span className="text-amber-400 flex">
                            {[...Array(5)].map((_, stars) => (
                              <svg key={stars} className={`w-3 h-3 ${stars < Math.round(review.rating) ? 'fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </span>
                          {review.relative_time_description && (
                            <span className="text-xs text-slate-400">{review.relative_time_description}</span>
                          )}
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          "{review.text}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                  <a href={mapLink} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-semibold hover:underline">Read all reviews on Google &rarr;</a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12 mb-20 text-center border-t border-slate-200">
          <p className="text-slate-400 text-sm">
            Generated with AI &bull; Data provided by Google Maps &bull; <a href={mapLink} target="_blank" rel="noreferrer" className="underline hover:text-slate-600">View on Maps</a>
          </p>
        </div>
      </main>

      {isAdminOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
            <div className="p-6 bg-slate-900 text-white shrink-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold">Admin Dashboard</h2>
                  <p className="text-slate-400 text-sm">Manage website content and reviews</p>
                </div>
                <button onClick={() => setIsAdminOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors" data-testid="button-preview-admin-close">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-4 border-b border-slate-700">
                <button className="pb-3 text-sm font-medium text-blue-400 border-b-2 border-blue-400">Business Data</button>
                <button className="pb-3 text-sm font-medium text-slate-400 hover:text-white">Reviews ({reviews.length})</button>
                <button className="pb-3 text-sm font-medium text-slate-400 hover:text-white">AI Biz Bot</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        <th className="p-4">Include</th>
                        <th className="p-4">Field Name</th>
                        <th className="p-4">Value Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { field: 'name', value: place.name },
                        { field: 'address', value: place.formatted_address },
                        { field: 'rating', value: place.rating?.toString() || 'N/A' },
                        { field: 'phone', value: place.formatted_phone_number || 'N/A' },
                        { field: 'website', value: place.website || 'N/A' },
                        { field: 'opening_hours', value: hours.length > 0 ? `${hours.length} days` : 'N/A' },
                        { field: 'reviews', value: `${reviews.length} reviews` },
                        { field: 'photos', value: `${(place.photos || []).length} photos` },
                      ].map(({ field, value }) => (
                        <tr key={field} className="group hover:bg-slate-50 transition-colors">
                          <td className="p-4 w-16">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" defaultChecked className="sr-only peer" />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                            </label>
                          </td>
                          <td className="p-4 font-medium text-slate-700 font-mono text-sm">{field}</td>
                          <td className="p-4 text-slate-500 text-sm truncate max-w-xs">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 text-sm flex gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p>Unchecking items will hide the corresponding sections on the main website.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 z-50">
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-sm font-bold">AI</div>
              <span className="font-semibold">Assistant</span>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="hover:bg-blue-500 p-1 rounded-full" data-testid="button-preview-chat-close">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none">
                Hi there! I can help you with store hours, products, or directions. Ask me anything!
              </div>
            </div>
          </div>
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                data-testid="input-preview-chat"
              />
              <button className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors" data-testid="button-preview-chat-send">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isChatOpen && !isAdminOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-500 transition-transform hover:scale-105 flex items-center justify-center z-40"
          data-testid="button-preview-chat-fab"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </button>
      )}
    </div>
  );
}
