
export type TabType = 'itinerary' | 'maps' | 'tickets' | 'ai' | 'contacts' | 'admin';
export type RegistrationType = 'vendor' | 'attendee';

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  location: string;
  description: string;
  type: 'flight' | 'hotel' | 'food' | 'session' | 'party' | 'badge' | 'exhibit';
  date: string;
  coordinates?: { lat: number; lng: number };
}

export interface Session {
  id: string;
  date: string;
  time: string;
  topic: string;
  location: string;
  speaker?: string;
  description: string;
}

export interface CESEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  description?: string;
  access: 'Free' | 'Paid' | 'Invitation Only';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  grounding?: any[];
}

export interface Contact {
  name: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  profilePhoto?: string;
  backgroundImage?: string;
}

export interface AdminTicket {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  benefits: string[];
}

export interface AdminGuest {
  id: string;
  name: string;
  email: string;
  company: string;
  status: 'Registered' | 'Pending' | 'Checked In';
  ticketType: string;
  classification: RegistrationType;
  orderDate: string;
}

export interface AdminOrder {
  id: string;
  guestName: string;
  amount: number;
  date: string;
  status: 'Success' | 'Processing';
}
