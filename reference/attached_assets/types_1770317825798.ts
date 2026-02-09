export interface NearbyPlace {
  name: string;
  type: string;
  summary: string;
  location: string;
  rating: number;
  imageUrl?: string;
}

export interface Review {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
  profile_photo_url: string;
  time: number;
}

export interface BusinessData {
  name: string;
  tagline: string;
  description: string;
  address: string;
  rating: number;
  reviewCount: number;
  mapLink: string;
  hours: string[];
  reviews: Review[];
  insights: string[];
  images: string[];
  nearbyRestaurants: NearbyPlace[];
  nearbyActivities: NearbyPlace[];
  rawPlaceData: any;
}

export enum ViewState {
  LANDING = 'LANDING',
  LOADING = 'LOADING',
  GENERATED = 'GENERATED',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isUpsell?: boolean;
  upsellData?: {
    title: string;
    price: string;
    description: string;
    features: string[];
    cta: string;
  };
}