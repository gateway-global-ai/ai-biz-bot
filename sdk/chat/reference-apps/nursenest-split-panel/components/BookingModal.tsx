import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, MapPin, CreditCard, CheckCircle } from 'lucide-react';
import { Booking } from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialUri?: string;
  onConfirm: (booking: Omit<Booking, 'id' | 'status'>) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ 
  isOpen, 
  onClose, 
  initialTitle = '', 
  initialUri,
  onConfirm 
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<{
    title: string;
    type: Booking['type'];
    date: string;
    time: string;
    guests: number;
    name: string;
    email: string;
  }>({
    title: initialTitle,
    type: 'hotel',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    guests: 2,
    name: '',
    email: ''
  });

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData(prev => ({
        ...prev,
        title: initialTitle || '',
        type: initialTitle ? 'hotel' : 'flight'
      }));
    }
  }, [isOpen, initialTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2); // Move to payment simulation
  };

  const handleFinalConfirm = () => {
    setStep(3); // Success state
    setTimeout(() => {
      onConfirm({
        title: formData.title,
        type: formData.type,
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        confirmationCode: 'TP-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        uri: initialUri
      });
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-lg text-slate-800">
            {step === 1 ? 'Complete Reservation' : step === 2 ? 'Confirm Payment' : 'Booking Confirmed'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {step === 1 && (
            <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Service / Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Hotel Name, Restaurant, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Time</label>
                  <input 
                    type="time" 
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                 <label className="block text-xs font-medium text-slate-500 mb-1">Booking Type</label>
                 <div className="flex gap-2">
                    {['hotel', 'restaurant', 'activity', 'flight'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setFormData({...formData, type: t as any})}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border ${
                                formData.type === t 
                                ? 'bg-indigo-600 text-white border-indigo-600' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                 </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Guests</label>
                <div className="relative">
                    <Users className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input 
                        type="number" 
                        min="1"
                        required
                        value={formData.guests}
                        onChange={e => setFormData({...formData, guests: parseInt(e.target.value)})}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100 mt-2">
                 <label className="block text-xs font-medium text-slate-500 mb-1">Guest Name</label>
                 <input 
                    type="text"
                    required
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                 />
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Service</span>
                        <span className="font-medium text-slate-800">{formData.title}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Date</span>
                        <span className="font-medium text-slate-800">{formData.date} at {formData.time}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Guests</span>
                        <span className="font-medium text-slate-800">{formData.guests}</span>
                    </div>
                     <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Total</span>
                        <span className="font-bold text-indigo-600">$ -- (Pay at venue)</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                    <CreditCard className="text-slate-400" />
                    <div>
                        <p className="text-sm font-medium text-slate-700">Reservation Guarantee</p>
                        <p className="text-xs text-slate-500">No immediate charge. Pay upon arrival.</p>
                    </div>
                </div>
            </div>
          )}

          {step === 3 && (
             <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Booking Confirmed!</h3>
                <p className="text-slate-500 mt-2">Your reservation has been added to your itinerary.</p>
             </div>
          )}
        </div>

        {/* Footer */}
        {step < 3 && (
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
            {step === 1 ? (
                <button 
                    form="booking-form"
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    Continue
                </button>
            ) : (
                <div className="flex w-full gap-2">
                     <button 
                        onClick={() => setStep(1)}
                        className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-slate-50"
                    >
                        Back
                    </button>
                    <button 
                        onClick={handleFinalConfirm}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 shadow-sm"
                    >
                        Confirm Booking
                    </button>
                </div>
            )}
            </div>
        )}
      </div>
    </div>
  );
};