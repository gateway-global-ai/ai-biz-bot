import { useState, useRef, useEffect } from 'react';

// ============================================================================
// CHAT WIDGET - EXACT FROM YOUR CODE
// ============================================================================

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface ChatWidgetProps {
  isOpen: boolean;
  welcomeMessage?: string;
  onClose?: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, welcomeMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (welcomeMessage) {
      setMessages([{ role: 'model', text: welcomeMessage }]);
    } else {
      setMessages([{ role: 'model', text: 'Hi there! I can help you with store hours, products, or directions. Ask me anything!' }]);
    }
  }, [welcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I'll help you with that right away.",
        "Great question! Let me check that for you.",
        "I can definitely help with that. Here's what I found...",
        "Absolutely! Let me handle that for you.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { role: 'model', text: randomResponse }]);
      setIsTyping(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      {/* Header - EXACT FROM YOUR CODE */}
      <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-sm font-bold">AI</div>
          <span className="font-semibold">Assistant</span>
        </div>
      </div>
      
      {/* Messages - EXACT FROM YOUR CODE */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
               <div className="flex space-x-1">
                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
               </div>
             </div>
           </div>
        )}
      </div>

      {/* Input - EXACT FROM YOUR CODE */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Bot: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
    </svg>
  ),
  Crown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
    </svg>
  ),
  Plug: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5"/><path d="M15 8V2"/><path d="M9 8V2"/><path d="M12 8a5 5 0 0 1 5 5v4a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-4a5 5 0 0 1 5-5Z"/>
    </svg>
  ),
  Palette: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.01 17.461 2 12 2z"/>
    </svg>
  ),
  Database: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
    </svg>
  ),
  BarChart: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
    </svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    </svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  UserPlus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  Globe: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
  ),
  MessageSquare: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
    </svg>
  ),
  Key: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>
    </svg>
  ),
  Copy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  ),
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Activity: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  Phone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Briefcase: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
    </svg>
  ),
  MapPin: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Star: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
};

// ============================================================================
// TYPES
// ============================================================================

interface Agent {
  id: string;
  name: string;
  type: 'integration' | 'ui' | 'database' | 'analytics' | 'security' | 'custom';
  description: string;
  status: 'active' | 'paused' | 'error' | 'offline';
  lastActive: string;
  tasksCompleted: number;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error';
  apiKey?: string;
}

interface DataField {
  id: string;
  name: string;
  label: string;
  value: any;
  visible: boolean;
  section: string;
}

interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
  status: 'active' | 'pending';
  initials: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  lastContact: string;
  notes: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const AGENTS: Agent[] = [
  { id: 'agent-biz-admin', name: 'Biz Bot Admin', type: 'custom', description: 'Main controller - oversees all agents', status: 'active', lastActive: 'Just now', tasksCompleted: 1247 },
  { id: 'agent-integration', name: 'Integration Bot', type: 'integration', description: 'Manages API integrations', status: 'active', lastActive: '2 min ago', tasksCompleted: 89 },
  { id: 'agent-ui', name: 'UI Bot', type: 'ui', description: 'Edits UI components', status: 'active', lastActive: '5 min ago', tasksCompleted: 156 },
  { id: 'agent-database', name: 'Database Bot', type: 'database', description: 'Manages database schemas', status: 'active', lastActive: '12 min ago', tasksCompleted: 234 },
  { id: 'agent-analytics', name: 'Analytics Bot', type: 'analytics', description: 'Tracks metrics', status: 'paused', lastActive: '1 hour ago', tasksCompleted: 67 },
  { id: 'agent-security', name: 'Security Bot', type: 'security', description: 'Monitors security', status: 'active', lastActive: 'Just now', tasksCompleted: 412 },
];

const ACTIVE_INTEGRATIONS: Integration[] = [
  { id: 'int-google-places', name: 'Google Places API', description: 'Business data from Google Maps', category: 'Data', status: 'connected', apiKey: 'AIzaSy••••••••••••••••' },
  { id: 'int-stripe', name: 'Stripe', description: 'Online payment processing', category: 'Payments', status: 'connected', apiKey: 'pk_live_••••••••' },
  { id: 'int-zapier', name: 'Zapier', description: 'Workflow automation', category: 'Automation', status: 'connected' },
  { id: 'int-slack', name: 'Slack', description: 'Team communication', category: 'Communication', status: 'connected' },
  { id: 'int-aws', name: 'AWS S3', description: 'Cloud storage', category: 'Cloud', status: 'connected' },
  { id: 'int-vercel', name: 'Vercel', description: 'Frontend deployment', category: 'Hosting', status: 'connected' },
  { id: 'int-supabase', name: 'Supabase', description: 'Database', category: 'Database', status: 'connected' },
];

// Google Places API Fields - All fields from the API
const GOOGLE_PLACES_FIELDS: DataField[] = [
  // Basic Info
  { id: 'gp-name', name: 'name', label: 'Business Name', value: 'Boardwalk Suites Lafayette', visible: true, section: 'Basic Info' },
  { id: 'gp-place_id', name: 'place_id', label: 'Place ID', value: 'ChIJ8bo5AQWbJYRITCBabuK0Rx0', visible: true, section: 'Basic Info' },
  { id: 'gp-business_status', name: 'business_status', label: 'Business Status', value: 'OPERATIONAL', visible: true, section: 'Basic Info' },
  
  // Address
  { id: 'gp-formatted_address', name: 'formatted_address', label: 'Formatted Address', value: '1605 N University Ave, Lafayette, LA 70506', visible: true, section: 'Address' },
  { id: 'gp-street_number', name: 'street_number', label: 'Street Number', value: '1605', visible: true, section: 'Address' },
  { id: 'gp-route', name: 'route', label: 'Route', value: 'North University Avenue', visible: true, section: 'Address' },
  { id: 'gp-locality', name: 'locality', label: 'City', value: 'Lafayette', visible: true, section: 'Address' },
  { id: 'gp-administrative_area_level_1', name: 'administrative_area_level_1', label: 'State', value: 'Louisiana', visible: true, section: 'Address' },
  { id: 'gp-postal_code', name: 'postal_code', label: 'Postal Code', value: '70506', visible: true, section: 'Address' },
  { id: 'gp-country', name: 'country', label: 'Country', value: 'United States', visible: true, section: 'Address' },
  { id: 'gp-neighborhood', name: 'neighborhood', label: 'Neighborhood', value: 'Freetown-Port Rico', visible: false, section: 'Address' },
  
  // Contact
  { id: 'gp-formatted_phone_number', name: 'formatted_phone_number', label: 'Phone Number', value: '(337) 305-7110', visible: true, section: 'Contact' },
  { id: 'gp-international_phone_number', name: 'international_phone_number', label: 'International Phone', value: '+1 337-305-7110', visible: false, section: 'Contact' },
  { id: 'gp-website', name: 'website', label: 'Website', value: 'https://boardwalksuites.com', visible: true, section: 'Contact' },
  
  // Location
  { id: 'gp-lat', name: 'lat', label: 'Latitude', value: '30.2125', visible: true, section: 'Location' },
  { id: 'gp-lng', name: 'lng', label: 'Longitude', value: '-92.0324', visible: true, section: 'Location' },
  { id: 'gp-vicinity', name: 'vicinity', label: 'Vicinity', value: '1605 N University Ave, Lafayette', visible: false, section: 'Location' },
  
  // Reviews & Ratings
  { id: 'gp-rating', name: 'rating', label: 'Rating', value: '4.7', visible: true, section: 'Reviews' },
  { id: 'gp-user_ratings_total', name: 'user_ratings_total', label: 'Total Reviews', value: '128', visible: true, section: 'Reviews' },
  { id: 'gp-price_level', name: 'price_level', label: 'Price Level', value: '$$', visible: true, section: 'Reviews' },
  
  // Categories
  { id: 'gp-primary_type', name: 'primary_type', label: 'Primary Type', value: 'lodging', visible: true, section: 'Categories' },
  { id: 'gp-types', name: 'types', label: 'All Types', value: 'lodging, real_estate_agency, point_of_interest, establishment', visible: true, section: 'Categories' },
  
  // Hours
  { id: 'gp-opening_hours', name: 'opening_hours', label: 'Opening Hours', value: 'Mon-Fri: 9AM-5PM, Sat: 10AM-4PM, Sun: Closed', visible: true, section: 'Hours' },
  { id: 'gp-open_now', name: 'open_now', label: 'Open Now', value: 'true', visible: true, section: 'Hours' },
  { id: 'gp-utc_offset', name: 'utc_offset', label: 'UTC Offset', value: '-360', visible: false, section: 'Hours' },
  
  // Photos & Media
  { id: 'gp-photos', name: 'photos', label: 'Photos', value: '12 photos available', visible: true, section: 'Media' },
  { id: 'gp-icon', name: 'icon', label: 'Icon URL', value: 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/lodging-71.png', visible: false, section: 'Media' },
  { id: 'gp-icon_background_color', name: 'icon_background_color', label: 'Icon Background', value: '#909CE1', visible: false, section: 'Media' },
  { id: 'gp-icon_mask_base_uri', name: 'icon_mask_base_uri', label: 'Icon Mask URI', value: 'https://maps.gstatic.com/mapfiles/place_api/icons/v2/hotel_pinlet', visible: false, section: 'Media' },
  
  // Editorial Content
  { id: 'gp-editorial_summary', name: 'editorial_summary', label: 'Editorial Summary', value: 'Modern suites with full kitchens', visible: true, section: 'Content' },
  
  // Accessibility
  { id: 'gp-wheelchair_accessible_entrance', name: 'wheelchair_accessible_entrance', label: 'Wheelchair Accessible', value: 'true', visible: true, section: 'Accessibility' },
  
  // Services
  { id: 'gp-curbside_pickup', name: 'curbside_pickup', label: 'Curbside Pickup', value: 'false', visible: false, section: 'Services' },
  { id: 'gp-delivery', name: 'delivery', label: 'Delivery', value: 'false', visible: false, section: 'Services' },
  { id: 'gp-dine_in', name: 'dine_in', label: 'Dine In', value: 'false', visible: false, section: 'Services' },
  { id: 'gp-reservable', name: 'reservable', label: 'Reservable', value: 'true', visible: true, section: 'Services' },
  { id: 'gp-serves_breakfast', name: 'serves_breakfast', label: 'Serves Breakfast', value: 'true', visible: true, section: 'Services' },
  { id: 'gp-serves_lunch', name: 'serves_lunch', label: 'Serves Lunch', value: 'false', visible: false, section: 'Services' },
  { id: 'gp-serves_dinner', name: 'serves_dinner', label: 'Serves Dinner', value: 'false', visible: false, section: 'Services' },
  { id: 'gp-serves_vegetarian_food', name: 'serves_vegetarian_food', label: 'Vegetarian Options', value: 'false', visible: false, section: 'Services' },
  { id: 'gp-serves_wine', name: 'serves_wine', label: 'Serves Wine', value: 'false', visible: false, section: 'Services' },
  { id: 'gp-takeout', name: 'takeout', label: 'Takeout', value: 'false', visible: false, section: 'Services' },
  { id: 'gp-serves_beer', name: 'serves_beer', label: 'Serves Beer', value: 'false', visible: false, section: 'Services' },
  { id: 'gp-serves_brunch', name: 'serves_brunch', label: 'Serves Brunch', value: 'true', visible: true, section: 'Services' },
  { id: 'gp-serves_coffee', name: 'serves_coffee', label: 'Serves Coffee', value: 'true', visible: true, section: 'Services' },
  
  // Links
  { id: 'gp-url', name: 'url', label: 'Google Maps URL', value: 'https://maps.google.com/?cid=1234567890', visible: true, section: 'Links' },
  { id: 'gp-html_attributions', name: 'html_attributions', label: 'HTML Attributions', value: '[]', visible: false, section: 'Links' },
];

const INITIAL_USERS: User[] = [
  { id: 'user-1', name: 'Sarah Johnson', email: 'sarah@company.com', phone: '+1 (555) 123-4567', role: 'Manager', status: 'active', initials: 'SJ' },
  { id: 'user-2', name: 'Mike Chen', email: 'mike@company.com', phone: '+1 (555) 987-6543', role: 'Sales Rep', status: 'active', initials: 'MC' },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'John Smith', email: 'john.smith@email.com', phone: '(555) 111-2222', status: 'active', lastContact: '2024-02-01', notes: 'Regular customer, prefers email contact' },
  { id: 'cust-2', name: 'Emily Davis', email: 'emily.davis@email.com', phone: '(555) 222-3333', status: 'active', lastContact: '2024-02-03', notes: 'Interested in premium services' },
  { id: 'cust-3', name: 'Michael Brown', email: 'mbrown@email.com', phone: '(555) 333-4444', status: 'inactive', lastContact: '2024-01-15', notes: 'Follow up needed' },
  { id: 'cust-4', name: 'Lisa Wilson', email: 'lisa.wilson@email.com', phone: '(555) 444-5555', status: 'active', lastContact: '2024-02-05', notes: 'New customer this month' },
  { id: 'cust-5', name: 'David Garcia', email: 'd.garcia@email.com', phone: '(555) 555-6666', status: 'active', lastContact: '2024-02-04', notes: 'Referred by John Smith' },
];

const INITIAL_TASKS: Task[] = [
  { id: 'task-1', title: 'Update website content', description: 'Refresh homepage with new branding', assignedTo: 'agent-ui', assignedToName: 'UI Bot', status: 'in-progress', priority: 'high', dueDate: '2024-02-10' },
  { id: 'task-2', title: 'Fix database connection', description: 'Resolve timeout issues with Supabase', assignedTo: 'agent-database', assignedToName: 'Database Bot', status: 'todo', priority: 'high', dueDate: '2024-02-08' },
  { id: 'task-3', title: 'Add Google Places integration', description: 'Implement Places API for location data', assignedTo: 'agent-integration', assignedToName: 'Integration Bot', status: 'completed', priority: 'medium', dueDate: '2024-02-05' },
  { id: 'task-4', title: 'Generate monthly analytics report', description: 'Compile user engagement metrics', assignedTo: 'agent-analytics', assignedToName: 'Analytics Bot', status: 'in-progress', priority: 'medium', dueDate: '2024-02-15' },
  { id: 'task-5', title: 'Security audit', description: 'Review access logs and permissions', assignedTo: 'agent-security', assignedToName: 'Security Bot', status: 'todo', priority: 'low', dueDate: '2024-02-20' },
  { id: 'task-6', title: 'Customer onboarding flow', description: 'Design new user welcome experience', assignedTo: 'agent-ui', assignedToName: 'UI Bot', status: 'todo', priority: 'medium', dueDate: '2024-02-18' },
];

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  // AI Mode toggle - ON by default
  const [aiMode, setAiMode] = useState(true);
  
  // AI Mode tabs: Chat | Customers | Tasks | Phone
  const [aiTab, setAiTab] = useState('chat');
  
  // Developer tabs: Agents | Integrations | Data | Api | Permissions
  const [devTab, setDevTab] = useState('agents');
  
  // Data
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [integrations] = useState<Integration[]>(ACTIVE_INTEGRATIONS);
  const [dataFields, setDataFields] = useState<DataField[]>(GOOGLE_PLACES_FIELDS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  
  // View toggles for developer mode
  const [integrationsView, setIntegrationsView] = useState<'owner' | 'developer'>('owner');
  const [permissionsView, setPermissionsView] = useState<'admin' | 'developer'>('admin');
  
  // Add user modal
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: '' });
  
  // Add customer modal
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', notes: '' });
  
  // Add task modal
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });

  const toggleAgentStatus = (agentId: string) => {
    setAgents(prev => prev.map(a => 
      a.id === agentId ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a
    ));
  };

  const toggleField = (fieldId: string) => {
    setDataFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, visible: !f.visible } : f
    ));
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.phone || !newUser.role) return;
    const initials = newUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
    setUsers([...users, { 
      id: `user-${Date.now()}`, 
      ...newUser, 
      status: 'pending', 
      initials 
    }]);
    setNewUser({ name: '', email: '', phone: '', role: '' });
    setAddUserOpen(false);
  };

  const deleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
  };
  
  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    setCustomers([...customers, { 
      id: `cust-${Date.now()}`, 
      ...newCustomer, 
      status: 'active', 
      lastContact: new Date().toISOString().split('T')[0]
    }]);
    setNewCustomer({ name: '', email: '', phone: '', notes: '' });
    setAddCustomerOpen(false);
  };
  
  const deleteCustomer = (customerId: string) => {
    setCustomers(customers.filter(c => c.id !== customerId));
  };
  
  const handleAddTask = () => {
    if (!newTask.title || !newTask.assignedTo) return;
    const assignedAgent = agents.find(a => a.id === newTask.assignedTo);
    setTasks([...tasks, { 
      id: `task-${Date.now()}`, 
      ...newTask,
      assignedToName: assignedAgent?.name || 'Unknown',
      status: 'todo'
    } as Task]);
    setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
    setAddTaskOpen(false);
  };
  
  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };
  
  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const getAgentColor = (type: string) => {
    switch (type) {
      case 'custom': return 'bg-amber-100 text-amber-700';
      case 'integration': return 'bg-orange-100 text-orange-700';
      case 'ui': return 'bg-pink-100 text-pink-700';
      case 'database': return 'bg-cyan-100 text-cyan-700';
      case 'analytics': return 'bg-indigo-100 text-indigo-700';
      case 'security': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'custom': return <Icons.Crown />;
      case 'integration': return <Icons.Plug />;
      case 'ui': return <Icons.Palette />;
      case 'database': return <Icons.Database />;
      case 'analytics': return <Icons.BarChart />;
      case 'security': return <Icons.Shield />;
      default: return <Icons.Bot />;
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'todo': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Group data fields by section
  const sections = Array.from(new Set(dataFields.map(f => f.section)));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HEADER - Dark */}
      <header className="bg-slate-900 text-white">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Icons.Bot />
            </div>
            <h1 className="font-semibold text-lg">Admin Dashboard</h1>
          </div>
          
          {/* AI Mode Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">AI Mode</span>
            <button
              onClick={() => setAiMode(!aiMode)}
              className={`relative w-14 h-7 rounded-full transition-colors ${aiMode ? 'bg-blue-600' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${aiMode ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </div>
        
        {/* TABS */}
        <div className="flex border-b border-slate-700">
          {aiMode ? (
            // AI Mode Tabs: Chat | Customers | Tasks | Phone
            ['chat', 'customers', 'tasks', 'phone'].map(tab => (
              <button
                key={tab}
                onClick={() => setAiTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                  aiTab === tab 
                    ? 'text-white border-b-2 border-blue-500' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))
          ) : (
            // Developer Tabs: Agents | Integrations | Data | Api | Permissions
            ['agents', 'integrations', 'data', 'api', 'permissions'].map(tab => (
              <button
                key={tab}
                onClick={() => setDevTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                  devTab === tab 
                    ? 'text-white border-b-2 border-blue-500' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 overflow-auto">
        {aiMode ? (
          // AI MODE CONTENT
          <div className="max-w-4xl mx-auto h-[calc(100vh-140px)]">
            {aiTab === 'chat' && (
              <ChatWidget 
                isOpen={true} 
                welcomeMessage="Hi! I'm your Biz Bot. I can help you manage your business, add integrations, or answer any questions. What would you like to do?"
              />
            )}
            
            {aiTab === 'customers' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Customers</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage your customer relationships</p>
                  </div>
                  <button 
                    onClick={() => setAddCustomerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Icons.Plus />
                    Add Customer
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Contact</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Last Contact</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map(customer => (
                          <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-slate-400">{customer.notes}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">{customer.email}</div>
                              <div className="text-xs text-slate-400">{customer.phone}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 text-xs rounded-full ${customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                {customer.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-500">{customer.lastContact}</td>
                            <td className="py-3 px-4">
                              <button 
                                onClick={() => deleteCustomer(customer.id)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Icons.Trash />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {aiTab === 'tasks' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Tasks</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage tasks assigned to your AI agents</p>
                  </div>
                  <button 
                    onClick={() => setAddTaskOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Icons.Plus />
                    Add Task
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                  <div className="grid gap-4">
                    {tasks.map(task => (
                      <div key={task.id} className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{task.title}</h4>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 mb-3">{task.description}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Icons.Bot />
                                Assigned to: {task.assignedToName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Icons.Calendar />
                                Due: {task.dueDate}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                              className={`px-3 py-1.5 text-sm rounded-lg border ${getStatusColor(task.status)} border-transparent`}
                            >
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            <button 
                              onClick={() => deleteTask(task.id)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {aiTab === 'phone' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                    <Icons.Phone />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Phone Integration</h2>
                  <p className="text-slate-500 max-w-md">Phone integration coming soon. Ask your Biz Bot to set up call handling.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // DEVELOPER MODE CONTENT
          <div className="max-w-4xl mx-auto">
            {devTab === 'agents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Active Agents</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Icons.Plus />
                    Add Agent
                  </button>
                </div>
                {agents.map(agent => (
                  <div key={agent.id} className={`p-4 rounded-xl border ${agent.status === 'active' ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${getAgentColor(agent.type)}`}>
                        {getAgentIcon(agent.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{agent.name}</h3>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={agent.status === 'active'}
                              onChange={() => toggleAgentStatus(agent.id)}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{agent.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Icons.Check /> {agent.tasksCompleted} tasks</span>
                          <span className="flex items-center gap-1"><Icons.Clock /> {agent.lastActive}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {devTab === 'integrations' && (
              <div className="space-y-4">
                {/* View Toggle */}
                <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                  <button
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${integrationsView === 'owner' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    onClick={() => setIntegrationsView('owner')}
                  >
                    Owner
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${integrationsView === 'developer' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    onClick={() => setIntegrationsView('developer')}
                  >
                    Developer
                  </button>
                </div>

                {integrationsView === 'owner' ? (
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                      <Icons.Sparkles />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Need an Integration?</h3>
                    <p className="text-white/80 mb-6">Message your AI Biz Bot to add new features and integrations.</p>
                    <button 
                      onClick={() => { setAiMode(true); setAiTab('chat'); }}
                      className="px-6 py-3 bg-white text-blue-600 font-medium rounded-xl hover:bg-white/90 transition-colors"
                    >
                      Chat with Biz Bot
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {integrations.map(int => (
                      <div key={int.id} className="p-4 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg"><Icons.Plug /></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{int.name}</h4>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${int.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-xs capitalize text-slate-500">{int.status}</span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-500">{int.description}</p>
                            {int.apiKey && <p className="text-xs font-mono text-slate-400 mt-2">API: {int.apiKey}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {devTab === 'data' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Google Places API Data</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage data fields from your Google Places integration</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Connected
                  </div>
                </div>
                
                {sections.map(section => {
                  const fields = dataFields.filter(f => f.section === section);
                  if (fields.length === 0) return null;
                  return (
                    <div key={section}>
                      <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">{section}</h4>
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {fields.map((field, idx) => (
                          <div key={field.id} className={`flex items-center justify-between p-4 ${idx !== fields.length - 1 ? 'border-b border-slate-100' : ''}`}>
                            <div className="flex items-center gap-3">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={field.visible} onChange={() => toggleField(field.id)} />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                              </label>
                              <div>
                                <p className="font-medium">{field.label}</p>
                                <p className="text-xs text-slate-400 font-mono">{field.name}</p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{String(field.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {devTab === 'api' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Website API</h2>
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Base URL</label>
                    <div className="flex gap-2">
                      <input value="https://api.yoursite.com/v1" readOnly className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" />
                      <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Icons.Copy /></button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {['GET /api/v1/pages', 'POST /api/v1/pages', 'GET /api/v1/agents', 'GET /api/v1/customers', 'GET /api/v1/tasks', 'GET /api/v1/integrations'].map((ep, i) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-slate-200">
                      <code className="text-sm font-mono text-slate-700">{ep}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {devTab === 'permissions' && (
              <div className="space-y-4">
                {/* View Toggle */}
                <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                  <button
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${permissionsView === 'admin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    onClick={() => setPermissionsView('admin')}
                  >
                    Admin
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${permissionsView === 'developer' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    onClick={() => setPermissionsView('developer')}
                  >
                    Developer
                  </button>
                </div>

                {permissionsView === 'admin' ? (
                  <div className="space-y-4">
                    {/* Page Admin */}
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">BA</div>
                          <div>
                            <p className="font-medium">Biz Bot Admin</p>
                            <p className="text-xs text-slate-500">System Controller</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Full Access</span>
                      </div>
                    </div>

                    {/* Authorized Users */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Authorized Users</h3>
                      <button onClick={() => setAddUserOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Icons.UserPlus />
                        Add User
                      </button>
                    </div>
                    {users.map(user => (
                      <div key={user.id} className="p-4 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold">{user.initials}</div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.role} • {user.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {user.status === 'pending' ? 'Pending' : 'Active'}
                            </span>
                            <button onClick={() => deleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-500"><Icons.Trash /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agents.filter(a => a.type !== 'custom').map(agent => (
                      <div key={agent.id} className="p-4 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getAgentColor(agent.type)}`}>{getAgentIcon(agent.type)}</div>
                          <div>
                            <h4 className="font-medium">{agent.name}</h4>
                            <p className="text-xs text-slate-500">{agent.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add User Modal */}
      {addUserOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name *</label>
                <input 
                  type="text" 
                  value={newUser.name} 
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone *</label>
                <input 
                  type="tel" 
                  value={newUser.phone} 
                  onChange={e => setNewUser({...newUser, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email <span className="text-slate-400">(optional)</span></label>
                <input 
                  type="email" 
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role *</label>
                <select 
                  value={newUser.role} 
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="Manager">Manager</option>
                  <option value="Sales Rep">Sales Rep</option>
                  <option value="Support">Support</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAddUserOpen(false)} className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleAddUser} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Send Invitation</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Customer Modal */}
      {addCustomerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Customer</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name *</label>
                <input 
                  type="text" 
                  value={newCustomer.name} 
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone *</label>
                <input 
                  type="tel" 
                  value={newCustomer.phone} 
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <input 
                  type="email" 
                  value={newCustomer.email} 
                  onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <textarea 
                  value={newCustomer.notes} 
                  onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAddCustomerOpen(false)} className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleAddCustomer} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Customer</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Task Modal */}
      {addTaskOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Task</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title *</label>
                <input 
                  type="text" 
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea 
                  value={newTask.description} 
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Assign to Agent *</label>
                <select 
                  value={newTask.assignedTo} 
                  onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select agent...</option>
                  {agents.filter(a => a.type !== 'custom').map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <select 
                    value={newTask.priority} 
                    onChange={e => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Due Date</label>
                  <input 
                    type="date" 
                    value={newTask.dueDate} 
                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAddTaskOpen(false)} className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleAddTask} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
