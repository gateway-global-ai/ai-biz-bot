

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  groundingMetadata?: GroundingMetadata;
  isLoading?: boolean;
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: any[]; // Simplified for this use case
  webSearchQueries?: string[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeId?: string;
    placeAnswerSources?: {
        reviewSnippets?: {
            snippet?: string;
        }[]
    }
  };
}

export interface TripNote {
  id: string;
  content: string;
  date: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Booking {
  id: string;
  type: 'hotel' | 'restaurant' | 'flight' | 'activity' | 'other';
  title: string;
  date: string;
  time?: string;
  guests?: number;
  confirmationCode?: string;
  status: 'confirmed' | 'pending';
  uri?: string;
}

export type TransportMode = 'driving' | 'rideshare' | 'walking' | 'bicycling' | 'transit';

export interface TripFocus {
  id: string;
  name: string;
  location?: string;
  type: 'event' | 'work' | 'leisure';
  uri?: string;
  transportMode?: TransportMode;
}

// Budget Types
export type ExpenseCategory = 'Housing' | 'Utilities' | 'Groceries' | 'Transport' | 'Entertainment' | 'Other';

export interface Expense {
    id: string;
    category: ExpenseCategory;
    amount: number;
    description: string;
    date: string;
}

export interface TripBudget {
    limit: number;
    expenses: Expense[];
}

// Task / To-Do Types
export interface Task {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
}

// Google Workspace Integration Types
export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
    phoneNumber?: string; // Added phone number
}

export interface GoogleAuthToken {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
}