/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Power, Menu, Maximize2, History, RotateCcw, Zap, Check, 
  Bot, Users, ChevronRight, Star, ZapOff, Scale, LayoutDashboard, 
  Users as UsersIcon, Calendar, Settings, User as UserIcon, LogOut,
  CheckCircle2, AlertCircle, Clock, QrCode, Search, Filter, MoreVertical,
  ArrowRight, Phone, MessageSquare, ShieldCheck, Smartphone, Key, UserCheck,
  Plus
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { QRCodeCanvas } from 'qrcode.react';

// --- Types ---
interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'IN PROGRESS' | 'FOLLOW UP' | 'READY' | 'INTAKE';
  lastActive: string;
  isVerified: boolean;
  lastVisit: string;
  planType: string;
}

interface Message {
  id: string;
  sender: 'ai' | 'client' | 'receptionist';
  text: string;
  timestamp: string;
}

interface VoiceState {
  isActive: boolean;
  isConnecting: boolean;
  isListening: boolean;
  isSpeaking: boolean;
}

// --- Mock Data ---
const MOCK_CLIENTS: Client[] = [
  { id: '1', name: 'SARAH JENKINS', phone: '(702) 555-0123', email: 'sarah.j@example.com', status: 'READY', lastActive: '2m ago', isVerified: true, lastVisit: '2026-03-10', planType: 'Wellness Gold' },
  { id: '2', name: 'MARCUS THORNE', phone: '(702) 555-0124', email: 'marcus.t@example.com', status: 'IN PROGRESS', lastActive: '5m ago', isVerified: true, lastVisit: '2026-03-12', planType: 'Acute Care' },
  { id: '3', name: 'ELENA RODRIGUEZ', phone: '(702) 555-0125', email: 'elena.r@example.com', status: 'INTAKE', lastActive: '1m ago', isVerified: false, lastVisit: 'New Patient', planType: 'Initial Consult' },
  { id: '4', name: 'DAVID CHEN', phone: '(702) 555-0126', email: 'david.c@example.com', status: 'FOLLOW UP', lastActive: '15m ago', isVerified: true, lastVisit: '2026-02-28', planType: 'Wellness Silver' },
  { id: '5', name: 'AMANDA LEWIS', phone: '(702) 555-0127', email: 'amanda.l@example.com', status: 'READY', lastActive: '1h ago', isVerified: true, lastVisit: '2026-03-05', planType: 'Wellness Gold' },
  { id: '6', name: 'ROBERT GARCIA', phone: '(702) 555-0128', email: 'robert.g@example.com', status: 'FOLLOW UP', lastActive: '3h ago', isVerified: true, lastVisit: '2026-03-01', planType: 'Maintenance' },
];

const MOCK_MESSAGES: Message[] = [
  { id: '1', sender: 'ai', text: 'Welcome back, Sarah! I see you are here for your weekly spinal adjustment with Dr. Miller. Is that correct?', timestamp: '10:14 AM' },
  { id: '2', sender: 'client', text: 'Yes, that is right. My lower back has been a bit tight lately.', timestamp: '10:14 AM' },
  { id: '3', sender: 'ai', text: 'I will make a note of that for Dr. Miller. Please take a seat, and we will have you in the adjustment room shortly.', timestamp: '10:15 AM' },
];

// --- Components ---

const ClientsView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filteredClients = MOCK_CLIENTS.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search patients by name, phone, or email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm font-bold text-[#1a2b4b] outline-none focus:ring-2 focus:ring-[#2962ff]/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            <Filter size={18} />
          </button>
        </div>
        <button className="px-4 py-2 bg-[#1a2b4b] text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2">
          <Plus size={14} /> Add New Patient
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Patient Table */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Visit</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Type</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr 
                    key={client.id} 
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${selectedClient?.id === client.id ? 'bg-[#2962ff]/5' : ''}`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#1a2b4b] font-black text-xs">
                          {client.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-[#1a2b4b] tracking-tighter">{client.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">ID: {client.id}00{client.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-600">{client.phone}</span>
                        <span className="text-[10px] text-slate-400">{client.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{client.lastVisit}</span>
                    </td>
                    <td className="p-4 text-[10px] font-bold text-slate-400 uppercase">
                      {client.planType}
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-[#1a2b4b] transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Account Side Panel */}
        <AnimatePresence mode="wait">
          {selectedClient ? (
            <motion.div 
              key={selectedClient.id}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="w-96 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden"
            >
              <div className="p-6 bg-[#1a2b4b] text-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-2xl">
                    {selectedClient.name.charAt(0)}
                  </div>
                  <button onClick={() => setSelectedClient(null)} className="text-white/40 hover:text-white transition-colors">
                    <LogOut size={20} className="rotate-180" />
                  </button>
                </div>
                <h3 className="text-xl font-black tracking-tighter uppercase">{selectedClient.name}</h3>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Patient Since 2022 • {selectedClient.planType}</p>
              </div>

              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[#1a2b4b] uppercase tracking-widest border-b border-slate-100 pb-2">Contact Information</h4>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span className="text-xs font-bold">{selectedClient.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <MessageSquare size={14} className="text-slate-400" />
                    <span className="text-xs font-bold">{selectedClient.email}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[#1a2b4b] uppercase tracking-widest border-b border-slate-100 pb-2">Wellness Stats</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[8px] font-bold text-slate-400 uppercase">Total Visits</div>
                      <div className="text-lg font-black text-[#1a2b4b]">24</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[8px] font-bold text-slate-400 uppercase">Last Adjustment</div>
                      <div className="text-lg font-black text-[#1a2b4b]">3d ago</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[#1a2b4b] uppercase tracking-widest border-b border-slate-100 pb-2">Recent Activity</h4>
                  <div className="space-y-3">
                    {[
                      { date: 'Mar 10', action: 'Spinal Adjustment', provider: 'Dr. Miller' },
                      { date: 'Mar 03', action: 'Wellness Consultation', provider: 'Dr. Miller' },
                      { date: 'Feb 24', action: 'X-Ray Review', provider: 'Dr. Miller' },
                    ].map((act, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <div className="flex flex-col">
                          <span className="font-black text-[#1a2b4b] uppercase">{act.action}</span>
                          <span className="font-bold text-slate-400">{act.provider}</span>
                        </div>
                        <span className="font-bold text-slate-400 uppercase">{act.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-2">
                <button className="flex-1 py-3 bg-[#1a2b4b] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1a2b4b]/90 transition-all">Book Session</button>
                <button className="px-4 py-3 border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">Edit</button>
              </div>
            </motion.div>
          ) : (
            <div className="w-96 bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                  <UserIcon size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1a2b4b] uppercase tracking-widest">No Patient Selected</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Select a patient from the list to view their full account details</p>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const appointments = [
    { day: 14, time: '09:00 AM', patient: 'Alice Johnson', type: 'Adjustment' },
    { day: 14, time: '11:30 AM', patient: 'Bob Smith', type: 'Spinal Scan' },
    { day: 15, time: '02:00 PM', patient: 'Charlie Brown', type: 'Consultation' },
    { day: 18, time: '10:00 AM', patient: 'Diana Prince', type: 'Follow-up' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-[#1a2b4b] tracking-tighter">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-1">
            <button className="p-2 hover:bg-slate-100 rounded-md transition-colors" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <button className="p-2 hover:bg-slate-100 rounded-md transition-colors" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[#1a2b4b] text-white text-[10px] font-bold uppercase tracking-widest rounded-md">Month</button>
          <button className="px-4 py-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-slate-50">Week</button>
          <button className="px-4 py-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-slate-50">Day</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {dayLabels.map(label => (
              <div key={label} className="bg-slate-50 p-4 text-center text-[10px] font-black text-slate-400 tracking-widest">
                {label}
              </div>
            ))}
            {[...Array(firstDayOfMonth)].map((_, i) => (
              <div key={`empty-${i}`} className="bg-white min-h-[120px]" />
            ))}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const hasAppts = appointments.filter(a => a.day === day);
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
              
              return (
                <div key={day} className={`bg-white min-h-[120px] p-3 border-t border-l border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group relative`}>
                  <span className={`text-xs font-bold ${isToday ? 'bg-[#2962ff] text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  <div className="mt-2 flex flex-col gap-1">
                    {hasAppts.map((appt, idx) => (
                      <div key={idx} className="text-[8px] font-bold bg-[#008a3e]/10 text-[#008a3e] p-1 rounded truncate border border-[#008a3e]/20">
                        {appt.time} - {appt.patient}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel: Today's Schedule */}
        <div className="w-80 border-l border-slate-200 bg-slate-50/50 flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-white">
            <h3 className="text-[10px] font-black text-[#1a2b4b] uppercase tracking-widest">Daily Schedule</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">FRIDAY, MARCH 13, 2026</p>
          </div>
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
            {appointments.map((appt, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 hover:border-[#2962ff]/30 transition-all cursor-pointer group">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-[#1a2b4b]">{appt.patient}</span>
                  <span className="text-[8px] font-bold text-[#008a3e] uppercase">{appt.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2962ff]" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{appt.type}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex -space-x-2">
                    <div className="w-5 h-5 rounded-full bg-slate-200 border border-white" />
                    <div className="w-5 h-5 rounded-full bg-slate-300 border border-white" />
                  </div>
                  <button className="text-[8px] font-bold text-[#2962ff] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Details</button>
                </div>
              </div>
            ))}
            <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:border-[#2962ff] hover:text-[#2962ff] transition-all flex items-center justify-center gap-2">
              <Plus size={14} /> Add Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Logo = ({ subtitle = "FRONT DESK" }: { subtitle?: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex items-center">
      <span className="text-2xl font-black tracking-tighter text-white">CLEAR</span>
      <span className="text-2xl font-black tracking-tighter text-[#008a3e] ml-1">VIEW</span>
    </div>
    <div className="bg-[#2962ff] px-3 py-1 rounded-md">
      <span className="text-xs font-bold text-white uppercase tracking-widest">{subtitle === "FRONT DESK" ? "AI FRONT DESK" : `AI ${subtitle}`}</span>
    </div>
  </div>
);

const ClientKiosk = ({ 
  onExit, 
  startVoiceChat, 
  stopVoiceChat, 
  voiceState, 
  micLevel, 
  isPTTActive, 
  setIsPTTActive 
}: { 
  onExit: () => void,
  startVoiceChat: () => void,
  stopVoiceChat: () => void,
  voiceState: VoiceState,
  micLevel: number,
  isPTTActive: boolean,
  setIsPTTActive: (active: boolean) => void
}) => {
  const [step, setStep] = useState<'WELCOME' | 'IDENTIFY' | 'VERIFY' | 'ACTIONS' | 'AI_CHAT'>('WELCOME');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const steps = {
    WELCOME: (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-8">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center text-[#008a3e]"
        >
          <Bot size={64} />
        </motion.div>
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-[#1a2b4b] tracking-tighter uppercase">Welcome to <br/> ClearView Chiropractic</h1>
          <p className="text-xl text-slate-400 font-bold uppercase tracking-widest">Your journey to wellness starts here</p>
        </div>
        <button 
          onClick={() => setStep('IDENTIFY')}
          className="mt-8 px-12 py-6 bg-[#1a2b4b] text-white rounded-2xl text-xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform flex items-center gap-4"
        >
          Tap to Start Check-in <ArrowRight size={24} />
        </button>
      </div>
    ),
    IDENTIFY: (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-[#1a2b4b] uppercase tracking-tighter">Identify Yourself</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest">Please enter your mobile number</p>
        </div>
        <div className="w-full max-w-md space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-inner border-2 border-slate-100">
            <input 
              type="tel" 
              placeholder="(000) 000-0000"
              className="w-full text-4xl font-black text-center text-[#1a2b4b] outline-none placeholder:text-slate-200"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((num) => (
              <button 
                key={num}
                onClick={() => {
                  if (num === 'OK') setStep('VERIFY');
                  else if (num === 'C') setPhoneNumber('');
                  else setPhoneNumber(prev => prev + num);
                }}
                className="h-20 bg-white rounded-2xl shadow-sm border border-slate-100 text-2xl font-black text-[#1a2b4b] hover:bg-slate-50 active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    ),
    VERIFY: (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-8">
        <div className="w-20 h-20 bg-[#008a3e]/10 rounded-full flex items-center justify-center text-[#008a3e]">
          <ShieldCheck size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-[#1a2b4b] uppercase tracking-tighter">Verification</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            We've sent a 4-digit code to <br/> <span className="text-[#1a2b4b]">{phoneNumber || '(702) 555-0123'}</span>
          </p>
        </div>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-16 h-20 bg-white rounded-2xl shadow-sm border-2 border-slate-100 flex items-center justify-center text-3xl font-black text-[#1a2b4b]">
              {i === 1 ? '8' : i === 2 ? '4' : ''}
            </div>
          ))}
        </div>
        <button 
          onClick={() => setStep('ACTIONS')}
          className="mt-4 text-[#2962ff] font-black uppercase tracking-widest text-sm hover:underline"
        >
          Resend Code
        </button>
        <button 
          onClick={() => setStep('ACTIONS')}
          className="px-12 py-5 bg-[#008a3e] text-white rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl"
        >
          Verify & Continue
        </button>
      </div>
    ),
    ACTIONS: (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-md">
            <img src="https://picsum.photos/seed/sarah/100/100" alt="Sarah" referrerPolicy="no-referrer" />
          </div>
          <div className="text-left">
            <h2 className="text-3xl font-black text-[#1a2b4b] tracking-tighter">HELLO, SARAH!</h2>
            <p className="text-xs text-[#008a3e] font-bold uppercase tracking-widest">Verified Patient • Wellness Plan Active</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          <button 
            onClick={() => setStep('AI_CHAT')}
            className="p-8 bg-white rounded-3xl shadow-sm border-2 border-slate-100 text-left hover:border-[#008a3e] transition-all group"
          >
            <div className="w-12 h-12 bg-[#008a3e]/10 rounded-2xl flex items-center justify-center text-[#008a3e] mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-black text-[#1a2b4b] uppercase tracking-tighter">Check-in for Adjustment</h3>
            <p className="text-sm text-slate-400 font-bold uppercase mt-2">Appointment with Dr. Miller @ 2:30 PM</p>
          </button>
          
          <button className="p-8 bg-white rounded-3xl shadow-sm border-2 border-slate-100 text-left hover:border-[#2962ff] transition-all group">
            <div className="w-12 h-12 bg-[#2962ff]/10 rounded-2xl flex items-center justify-center text-[#2962ff] mb-4 group-hover:scale-110 transition-transform">
              <Calendar size={24} />
            </div>
            <h3 className="text-xl font-black text-[#1a2b4b] uppercase tracking-tighter">Schedule Follow-up</h3>
            <p className="text-sm text-slate-400 font-bold uppercase mt-2">Book your next spinal health session</p>
          </button>

          <button className="p-8 bg-white rounded-3xl shadow-sm border-2 border-slate-100 text-left hover:border-slate-400 transition-all group">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 mb-4 group-hover:scale-110 transition-transform">
              <Smartphone size={24} />
            </div>
            <h3 className="text-xl font-black text-[#1a2b4b] uppercase tracking-tighter">Update Insurance</h3>
            <p className="text-sm text-slate-400 font-bold uppercase mt-2">Scan your new card or update info</p>
          </button>

          <button 
            onClick={() => setStep('AI_CHAT')}
            className="p-8 bg-[#1a2b4b] rounded-3xl shadow-xl text-left hover:scale-[1.02] transition-all group"
          >
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
              <Bot size={24} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Talk to Assistant</h3>
            <p className="text-sm text-white/60 font-bold uppercase mt-2">Ask questions about your treatment</p>
          </button>
        </div>
      </div>
    ),
    AI_CHAT: (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-200 bg-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1a2b4b] rounded-2xl flex items-center justify-center text-white">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1a2b4b] tracking-tighter uppercase">AI Wellness Assistant</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#008a3e] rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Listening for your voice...</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setStep('ACTIONS')}
            className="px-6 py-3 border-2 border-slate-200 rounded-xl text-[10px] font-black text-[#1a2b4b] uppercase tracking-widest hover:bg-slate-50"
          >
            Back to Menu
          </button>
        </div>
        
        <div className="flex-1 p-12 overflow-y-auto bg-slate-50 flex flex-col gap-8">
          <div className="max-w-2xl mx-auto w-full space-y-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[#1a2b4b] rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-md">
                <Bot size={20} />
              </div>
              <div className="bg-white p-6 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 text-lg text-slate-600 leading-relaxed">
                Hello Sarah! I've checked you in for your adjustment with Dr. Miller. While you wait, would you like to review your spinal health progress or ask about today's treatment plan?
              </div>
            </div>
            
            <div className="flex gap-4 flex-row-reverse">
              <div className="w-10 h-10 bg-[#008a3e] rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-md">
                <UserIcon size={20} />
              </div>
              <div className="bg-[#008a3e] p-6 rounded-3xl rounded-tr-none shadow-sm text-lg text-white leading-relaxed">
                I've been feeling a bit of tension in my neck this morning. Can we focus on that today?
              </div>
            </div>
          </div>
        </div>

        <div className="p-12 bg-white border-t border-slate-200 flex flex-col items-center gap-6">
          <div className="flex items-center gap-12">
            <button className="w-16 h-16 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-300 hover:text-[#1a2b4b] transition-colors">
              <RotateCcw size={24} />
            </button>
            <div className="relative">
              {isPTTActive && (
                <div 
                  className="absolute inset-0 bg-[#2962ff]/20 rounded-full animate-ping" 
                  style={{ transform: `scale(${1 + micLevel * 2})` }}
                />
              )}
              <button 
                onMouseDown={() => { setIsPTTActive(true); if(!voiceState.isActive) startVoiceChat(); }}
                onMouseUp={() => setIsPTTActive(false)}
                onMouseLeave={() => setIsPTTActive(false)}
                className={`w-24 h-24 rounded-full shadow-2xl flex items-center justify-center text-white relative z-10 transition-all ${isPTTActive ? 'bg-[#2962ff] scale-110' : 'bg-[#1a2b4b] hover:scale-105'}`}
              >
                <Mic size={40} />
              </button>
            </div>
            <button className="w-16 h-16 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-300 hover:text-[#1a2b4b] transition-colors">
              <History size={24} />
            </button>
          </div>
          <p className="text-sm font-black text-[#1a2b4b] uppercase tracking-[0.2em]">Voice Active • Speak Now</p>
        </div>
      </div>
    )
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f8fafc] flex flex-col overflow-hidden font-sans">
      <header className="h-24 bg-[#1a2b4b] flex items-center justify-between px-12 border-b border-white/10 shadow-lg">
        <Logo subtitle="CHIROPRACTIC" />
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Current Time</p>
            <p className="text-lg font-black text-white tracking-tighter">10:14 AM</p>
          </div>
          <button 
            onClick={onExit}
            className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors"
          >
            <LogOut size={24} />
          </button>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div 
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#008a3e]/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#2962ff]/5 rounded-full -ml-48 -mb-48 blur-3xl pointer-events-none" />
      </main>
      
      <footer className="h-16 bg-white border-t border-slate-200 flex items-center justify-center px-12">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Powered by ClearView AI • HIPAA Compliant Secure Session</p>
      </footer>
    </div>
  );
};

const StatusBadge = ({ status }: { status: Client['status'] }) => {
  const styles = {
    'IN PROGRESS': 'status-in-progress',
    'FOLLOW UP': 'status-follow-up',
    'READY': 'status-ready',
    'INTAKE': 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`status-badge ${styles[status]}`}>
      {status}
    </span>
  );
};

export default function App() {
  const [viewMode, setViewMode] = useState<'RECEPTIONIST' | 'CLIENT'>('RECEPTIONIST');
  const [activeTab, setActiveTab] = useState('ACTIVITY VIEWER');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isActive: false,
    isConnecting: false,
    isListening: false,
    isSpeaking: false,
  });
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isPTTActiveRef = useRef(false);

  useEffect(() => {
    isPTTActiveRef.current = isPTTActive;
  }, [isPTTActive]);

  const startVoiceChat = async () => {
    if (voiceState.isActive) return;
    setVoiceState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the AI assistant for Clear View Chiropractic. You are helping patients check in, manage appointments, and understand their spinal health plans. Speak professionally, warmly, and concisely. Focus on wellness and patient comfort.",
        },
        callbacks: {
          onopen: () => {
            setVoiceState({ isActive: true, isConnecting: false, isListening: true, isSpeaking: false });
            setupAudioStreaming(session);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              playAudioResponse(base64Audio);
              setVoiceState(prev => ({ ...prev, isSpeaking: true, isListening: false }));
            }
            if (message.serverContent?.turnComplete) {
              setVoiceState(prev => ({ ...prev, isSpeaking: false, isListening: true }));
            }
          },
          onclose: () => stopVoiceChat(),
        }
      });
      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to start voice chat:", error);
      setVoiceState(prev => ({ ...prev, isConnecting: false }));
    }
  };

  const setupAudioStreaming = async (session: any) => {
    if (!audioContextRef.current || !streamRef.current) return;
    await audioContextRef.current.resume();
    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(audioContextRef.current.destination);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      setMicLevel(rms);

      if (!isPTTActiveRef.current) return;
      
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      const uint8Array = new Uint8Array(pcmData.buffer);
      let binary = '';
      for (let i = 0; i < uint8Array.byteLength; i++) binary += String.fromCharCode(uint8Array[i]);
      const base64Data = btoa(binary);
      session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } });
    };
  };

  const playAudioResponse = async (base64Audio: string) => {
    if (!audioContextRef.current) return;
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const pcmData = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) float32Data[i] = pcmData[i] / 32768;
    const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start();
  };

  const stopVoiceChat = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setVoiceState({ isActive: false, isConnecting: false, isListening: false, isSpeaking: false });
    setMicLevel(0);
  };

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] overflow-hidden font-sans">
      {viewMode === 'CLIENT' && (
        <ClientKiosk 
          onExit={() => setViewMode('RECEPTIONIST')} 
          startVoiceChat={startVoiceChat}
          stopVoiceChat={stopVoiceChat}
          voiceState={voiceState}
          micLevel={micLevel}
          isPTTActive={isPTTActive}
          setIsPTTActive={setIsPTTActive}
        />
      )}
      
      {/* Sidebar */}
      <aside className="w-64 sidebar-navy flex flex-col z-20">
        <div className="p-4 flex items-center gap-2 border-b border-white/10">
          <Menu size={20} className="text-white/60" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Menu</span>
        </div>
        
        <nav className="flex-1 p-2 flex flex-col gap-1">
          {[
            { id: 'ACTIVITY VIEWER', icon: <LayoutDashboard size={18} /> },
            { id: 'CLIENTS', icon: <UsersIcon size={18} /> },
            { id: 'CALENDAR', icon: <Calendar size={18} /> },
            { id: 'SETTINGS', icon: <Settings size={18} /> },
            { id: 'CLEARVIEW ACCOUNT', icon: <UserIcon size={18} /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-white text-[#1a2b4b]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            >
              {item.icon}
              {item.id}
            </button>
          ))}
        </nav>

        <div className="p-8 flex flex-col items-center gap-4 bg-white/5">
          <button 
            onClick={() => setViewMode('CLIENT')}
            className="w-full py-3 bg-[#008a3e] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#008a3e]/80 transition-all flex items-center justify-center gap-2"
          >
            <Maximize2 size={14} /> Launch Kiosk
          </button>
          <div className="p-2 bg-white rounded-lg">
            <QRCodeCanvas value="https://clearview.ai/chat" size={120} fgColor="#008a3e" />
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Scan to access <br/> AI Assisted Chat</span>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-[#1a2b4b] flex items-center justify-center px-6 border-b border-white/10 relative z-10">
          <Logo />
          <div className="absolute right-6 flex items-center gap-4">
            <div className="flex items-center gap-2 text-white/60">
              <div className="w-2 h-2 bg-[#008a3e] rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest">System Online</span>
            </div>
            <button className="text-white/60 hover:text-white transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Viewport Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'ACTIVITY VIEWER' ? (
            <>
              {/* Left Panel: Activity Monitor */}
              <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 bg-[#1a2b4b]/5 border-b border-slate-200">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1a2b4b]">AI Activity Viewer</h3>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-200">
                  <div className="p-3 text-center border-r border-slate-200">
                    <div className="text-[8px] font-bold text-slate-400 uppercase">Arrivals</div>
                    <div className="text-xl font-black text-[#1a2b4b]">40</div>
                  </div>
                  <div className="p-3 text-center border-r border-slate-200">
                    <div className="text-[8px] font-bold text-slate-400 uppercase">In House</div>
                    <div className="text-xl font-black text-[#1a2b4b]">6</div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-[8px] font-bold text-slate-400 uppercase">Complete</div>
                    <div className="text-xl font-black text-[#1a2b4b]">35</div>
                  </div>
                </div>

                <div className="p-4 bg-[#1a2b4b]/5 border-b border-slate-200">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1a2b4b]">AI Assist Monitor</h3>
                </div>
                <div className="p-4 text-center border-b border-slate-200 bg-white">
                  <div className="text-3xl font-black text-[#1a2b4b]">8</div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase">In House</div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {MOCK_CLIENTS.map(client => (
                    <div key={client.id} className="p-3 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#1a2b4b]">{client.name}</span>
                        {client.isVerified && <CheckCircle2 size={12} className="text-[#008a3e]" />}
                      </div>
                      <StatusBadge status={client.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel: Chat Grid */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-100 flex flex-col gap-6">
                {/* Client Search Autocomplete */}
                <div className="relative">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2962ff] transition-colors">
                      <Search size={20} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Search clients by name, phone, or email..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onFocus={() => setShowSearchDropdown(true)}
                      className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-transparent shadow-sm focus:border-[#2962ff] outline-none text-sm font-bold text-[#1a2b4b] placeholder:text-slate-300 transition-all"
                    />
                  </div>
                  
                  <AnimatePresence>
                    {showSearchDropdown && searchTerm && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
                      >
                        {MOCK_CLIENTS.filter(c => 
                          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone.includes(searchTerm) ||
                          c.email.toLowerCase().includes(searchTerm.toLowerCase())
                        ).length > 0 ? (
                          MOCK_CLIENTS.filter(c => 
                            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.phone.includes(searchTerm) ||
                            c.email.toLowerCase().includes(searchTerm.toLowerCase())
                          ).map(client => (
                            <button 
                              key={client.id}
                              onClick={() => {
                                setSearchTerm(client.name);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#1a2b4b] font-black">
                                  {client.name.charAt(0)}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-black text-[#1a2b4b] uppercase tracking-tighter">{client.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{client.phone} • {client.email}</p>
                                </div>
                              </div>
                              <StatusBadge status={client.status} />
                            </button>
                          ))
                        ) : (
                          <div className="p-8 text-center">
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No clients found matching "{searchTerm}"</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Summary Cards Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Today's Activity Card */}
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-[#1a2b4b] uppercase tracking-[0.2em] flex items-center gap-2">
                        <Calendar size={16} className="text-[#2962ff]" />
                        Today's Activity
                      </h3>
                      <span className="text-[10px] font-bold text-[#008a3e] bg-[#008a3e]/10 px-3 py-1 rounded-full uppercase tracking-widest">Live Updates</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                        <div className="text-3xl font-black text-[#1a2b4b]">12</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Scheduled</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                        <div className="text-3xl font-black text-[#2962ff]">8</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Confirmed</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                        <div className="text-3xl font-black text-[#008a3e]">4</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Completed</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Activity Card */}
                  <div className="bg-[#1a2b4b] rounded-3xl p-8 shadow-xl flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                        <Zap size={16} className="text-yellow-400" />
                        AI Activity
                      </h3>
                      <div className="flex gap-2">
                        {['Total', 'Sales', 'Support', 'Other'].map(cat => (
                          <span key={cat} className="text-[8px] font-black text-white/40 uppercase tracking-widest">{cat}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { label: 'Phone Calls', icon: <Phone size={14} />, values: [45, 12, 28, 5] },
                        { label: 'AI Voice Calls', icon: <Mic size={14} />, values: [128, 84, 32, 12] },
                        { label: 'Web Traffic', icon: <Maximize2 size={14} />, values: [1240, 450, 680, 110] },
                        { label: 'Text Messages', icon: <MessageSquare size={14} />, values: [342, 156, 144, 42] },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="text-white/40">{item.icon}</div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.label}</span>
                          </div>
                          <div className="flex gap-4">
                            {item.values.map((val, idx) => (
                              <div key={idx} className={`w-12 text-right text-[10px] font-black ${idx === 0 ? 'text-white' : 'text-white/40'}`}>
                                {val > 999 ? (val/1000).toFixed(1) + 'k' : val}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Active Chat Sessions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="bg-white rounded-xl card-shadow overflow-hidden flex flex-col h-[400px]">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-[#1a2b4b] text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black tracking-widest">{MOCK_CLIENTS[(i-1) % MOCK_CLIENTS.length].name}</span>
                          <CheckCircle2 size={14} className="text-[#008a3e]" />
                        </div>
                        <MoreVertical size={14} className="text-white/60" />
                      </div>
                      <div className="p-3 bg-slate-50 border-b border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Current Status: {MOCK_CLIENTS[(i-1) % MOCK_CLIENTS.length].status}</span>
                      </div>
                      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                        {MOCK_MESSAGES.map(msg => (
                          <div key={msg.id} className="flex flex-col gap-1">
                            <div className={`p-3 rounded-xl text-[10px] leading-relaxed border ${msg.sender === 'ai' ? 'bg-slate-50 text-slate-600 border-slate-100' : 'bg-[#008a3e]/5 text-[#008a3e] border-[#008a3e]/10'}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <button className="p-2 text-slate-400 hover:text-[#1a2b4b] transition-colors"><RotateCcw size={14} /></button>
                          <button 
                            onMouseDown={() => { setIsPTTActive(true); if(!voiceState.isActive) startVoiceChat(); }}
                            onMouseUp={() => setIsPTTActive(false)}
                            onMouseLeave={() => setIsPTTActive(false)}
                            className={`flex-1 mx-4 py-2 rounded-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${isPTTActive ? 'bg-[#2962ff] text-white shadow-lg scale-105' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#2962ff] hover:text-[#2962ff]'}`}
                          >
                            <Mic size={14} />
                            {isPTTActive ? 'Transmitting...' : 'Hold to speak'}
                          </button>
                          <button className="p-2 text-slate-400 hover:text-[#1a2b4b] transition-colors"><RotateCcw size={14} className="rotate-180" /></button>
                        </div>
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
                            <Zap size={10} className="text-yellow-500" /> Clear Voice
                          </div>
                          <div className="flex items-center gap-1 text-[8px] font-bold text-[#008a3e] uppercase">
                            <div className="w-1 h-1 bg-[#008a3e] rounded-full" /> Connected
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : activeTab === 'CLIENTS' ? (
            <ClientsView />
          ) : activeTab === 'CALENDAR' ? (
            <CalendarView />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                  <Bot size={32} />
                </div>
                <h2 className="text-xl font-black text-[#1a2b4b] uppercase tracking-widest">{activeTab}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Section under development</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
