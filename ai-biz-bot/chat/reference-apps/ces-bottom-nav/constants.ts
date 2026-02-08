
import { ItineraryItem, Session, CESEvent } from './types';

export interface VenueProfile {
  name: string;
  rating: number;
  reviews: string;
  photo: string;
  summary: string;
  amenities: string[];
  category: string;
  priceLevel: string;
  address: string;
  phone: string;
  status: 'Open' | 'Closed';
}

export interface Exhibitor {
  id: string;
  name: string;
  summary: string;
  booth: string;
  category: string;
}

export const FEATURED_EXHIBITORS: Exhibitor[] = [
  {
    id: 'e1',
    name: 'Alps Alpine North America, Inc.',
    summary: 'We conduct business across three segments: Components, Sensors and Communication, and Modules and Systems. Our products and services tend to the needs of customers in many different sectors.',
    booth: '3826',
    category: 'Sensors & Modules'
  },
  {
    id: 'e2',
    name: 'dSPACE',
    summary: 'dSPACE is a leading provider of simulation and validation solutions worldwide for developing connected, autonomous, and electrically powered vehicles. Portfolio ranges from end-to-end solutions.',
    booth: '4500',
    category: 'Mobility'
  },
  {
    id: 'e3',
    name: 'Hidonix',
    summary: 'Among its innovations in AI and robotics, Hidonix develops cutting-edge navigation technologies that connect physical and digital spaces. Presenting proprietary indoor–outdoor navigation.',
    booth: '8941',
    category: 'AI & Robotics'
  },
  {
    id: 'e4',
    name: 'Kubota North America',
    summary: 'Kubota is built on 100+ years of developing innovative solutions that support the future of the earth and humanity by contributing products that help abundant and stable production of food.',
    booth: '6001',
    category: 'AgTech'
  },
  {
    id: 'e5',
    name: 'MicroLumix Bioscience Technologies',
    summary: "GermPass is the world's only lab-certified Automated Disinfection Technology. This patented technology instantly kills germs on High Volume Touchpoints automatically.",
    booth: '53607',
    category: 'HealthTech'
  },
  {
    id: 'e6',
    name: 'PTC',
    summary: 'Companies that make products the world relies on, rely on PTC. From planes to medical devices to wind turbines, our software enables smarter design, manufacturing, and service.',
    booth: '6027',
    category: 'Enterprise Software'
  },
  {
    id: 'e7',
    name: 'Quantum Computing Inc.',
    summary: 'Quantum Computing Inc. (QCi) (Nasdaq: QUBT) is pioneering quantum photonics to make advanced computing accessible today. Our systems harness light to capture, compute, and communicate.',
    booth: 'FT-16',
    category: 'Computing'
  },
  {
    id: 'e8',
    name: 'Sonatus',
    summary: 'Sonatus is driving the evolution toward AI-driven, software-defined vehicles that are intelligent, adaptive, and continuously optimized. Harnessing vehicle data for deep insights.',
    booth: '5439',
    category: 'Mobility AI'
  },
  {
    id: 'e9',
    name: 'Ynvisible, S.A.',
    summary: 'Ynvisible is disrupting the display industry with low-cost, ultra-low-power, thin, flexible, and customizable segmented epaper displays. Unlocking innovative ways to bring info to users.',
    booth: '8168',
    category: 'Displays'
  }
];

export const KEYNOTE_SESSIONS: Session[] = [
  { id: 's1', date: 'Wed, Jan 07', time: '9:20 AM-9:30 AM', topic: 'CES Foundry Kick-off', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'CES Official', description: 'Join us to officially open the inaugural CES Foundry!' },
  { id: 's2', date: 'Wed, Jan 07', time: '9:30 AM-10:00 AM', topic: 'From Concept to Reality: Creatives Using AI to Bring Big Ideas to Life', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'Industry Visionaries', description: 'Learn how visionaries merge their skills with advanced AI tools to unlock new workflows, prototype ideas, and deliver groundbreaking creative results.' },
  { id: 's3', date: 'Wed, Jan 07', time: '10:00 AM-10:30 AM', topic: 'Super Strategies for AI Enterprises', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'PwC', description: 'PwC CAIO Dan Priest joins Microsoft and Meta leaders to share how leading AI enterprises scale and evolve with AI at their core.' },
  { id: 's4', date: 'Wed, Jan 07', time: '10:30 AM-11:00 AM', topic: 'Physical AI and the Big Bang of General Robotics', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'NVIDIA', description: 'Join NVIDIA and Accenture to hear the latest in technology breakthroughs and requirements for building generalized robotics systems.' },
  { id: 's5', date: 'Wed, Jan 07', time: '11:00 AM-11:30 AM', topic: 'AI + Quantum: Unlocking the Next Era', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'Quantinuum', description: 'We are entering a new phase of technological convergence: artificial intelligence and quantum computing working hand-in-hand.' },
  { id: 's6', date: 'Wed, Jan 07', time: '11:30 AM-12:00 PM', topic: "America's AI Future: A Fireside Chat", location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'Michael Kratsios', description: 'Join White House OSTP Director Michael Kratsios and Kinsey Fabrizio discussing America’s AI leadership.' },
  { id: 's7', date: 'Wed, Jan 07', time: '12:00 PM-12:30 PM', topic: 'AI at the Helm of Marine Innovation', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'Brunswick', description: 'Experience how AI is making boating smarter, easier, and more connected.' },
  { id: 's8', date: 'Wed, Jan 07', time: '12:30 PM-1:00 PM', topic: 'The AI Reckoning: Blueprints for Tomorrow', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'EY', description: 'Discover the four futures of AI poised to redefine your industry—and why many leaders prepare for the wrong one.' },
  { id: 's9', date: 'Wed, Jan 07', time: '1:00 PM-1:30 PM', topic: 'Inside the AI-Native Enterprise', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'Monks', description: 'Get the blueprint for moving from AI pilots to enterprise transformation.' },
  { id: 's10', date: 'Wed, Jan 07', time: '1:30 PM-2:00 PM', topic: 'Fireside Chat – AI at Scale', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'Walmart’s Daniel Danker', description: 'Walmart’s Daniel Danker shares perspectives on the future of consumer and associate AI applications.' },
  { id: 's11', date: 'Wed, Jan 07', time: '2:00 PM-2:30 PM', topic: 'How AI & Location Tech Are Shaping Vehicles', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'HERE Technologies', description: 'Discover how AI and advanced location technologies are driving software-defined vehicle (SDV) development.' },
  { id: 's12', date: 'Wed, Jan 07', time: '2:30 PM-3:00 PM', topic: 'The Three Pillars of AI Scale', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'WESCO', description: 'This session maps blueprints for the AI economy across three pillars—AI Factory, Modular Data Centers, and Enterprise Edge.' },
  { id: 's13', date: 'Wed, Jan 07', time: '3:00 PM-3:30 PM', topic: 'AI-Powered Workflows: Transforming Operations', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'Zebra', description: 'How organizations improve profitability and customer experience through frontline AI and automation.' },
  { id: 's14', date: 'Wed, Jan 07', time: '3:30 PM-4:00 PM', topic: 'The Sovereign Subscription Edge', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'STRATA', description: 'Unveiling a subscription-edge blueprint to standardize deployment and turn operations into results.' },
  { id: 's15', date: 'Wed, Jan 07', time: '4:00 PM-4:30 PM', topic: 'Promoting Promise, Preventing Peril', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'Global Experts', description: 'Joining forces to build resilient, ethical AI that prioritizes people.' },
  { id: 's16', date: 'Wed, Jan 07', time: '4:30 PM-5:00 PM', topic: 'From Data to Experience: Mobility', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'Bosch', description: 'How automakers can harness AI to meet rising consumer expectations and build resilience.' },
  { id: 's17', date: 'Thu, Jan 08', time: '9:00 AM-9:30 AM', topic: 'Unlocking AI Transformation', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'Microsoft', description: 'Discover how AI is reshaping devices, connectivity, and experiences.' },
  { id: 's18', date: 'Thu, Jan 08', time: '9:30 AM-10:00 AM', topic: 'Real Returns on AI: Finding Winners', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'VC Leaders', description: 'Top VC leaders explore the next wave of AI investments – from infrastructure to applications.' },
  { id: 's19', date: 'Thu, Jan 08', time: '10:00 AM-10:30 AM', topic: 'Agents Among Us: Future of Work', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'Deloitte', description: 'How agentic AI is redefining workplace roles and boosting productivity.' },
  { id: 's20', date: 'Thu, Jan 08', time: '10:30 AM-11:00 AM', topic: 'Unstoppable Rise of Physical AI', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'DEEPX', description: 'Discussing Physical AI problems and how DEEPX and partners overcome them.' },
  { id: 's21', date: 'Thu, Jan 08', time: '11:00 AM-11:30 AM', topic: 'Pioneering AI for the Physical World', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'Hitachi', description: 'Showcasing AI breakthroughs driving efficiency across energy and manufacturing.' },
  { id: 's22', date: 'Thu, Jan 08', time: '11:30 AM-12:00 PM', topic: 'TalentCapital.AI - The Nations Capital', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'Regional Leaders', description: 'Explore how the Capital Region is operationalizing AI at scale.' },
  { id: 's23', date: 'Thu, Jan 08', time: '12:00 PM-12:30 PM', topic: 'Smarter Shopping: AI Agents in Retail', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'Deloitte', description: 'Discover how AI agents transform retail through personalization and supply chain optimization.' },
  { id: 's24', date: 'Thu, Jan 08', time: '12:30 PM-1:00 PM', topic: 'Robots Among Us: Age of Humanoids', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'Agility Robotics', description: 'Experts discuss developments and the future of humanoid robot partners.' },
  { id: 's25', date: 'Thu, Jan 08', time: '1:00 PM-1:30 PM', topic: 'Agentic AI: Consumer Electronics', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'AWS', description: 'Revolutionizing consumer electronics and business models with agentic AI.' },
  { id: 's26', date: 'Thu, Jan 08', time: '1:30 PM-2:00 PM', topic: 'AI as Infrastructure', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'AMD', description: 'A new competitive frontier for nations built on AI infrastructure.' },
  { id: 's27', date: 'Thu, Jan 08', time: '2:00 PM-2:30 PM', topic: 'Building the Full-Stack Quantum Future', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'Quantinuum', description: 'Advancing the state of quantum computing from hardware to full-stack implementation.' },
  { id: 's28', date: 'Thu, Jan 08', time: '2:30 PM-3:00 PM', topic: 'Inference Everywhere: Enterprise Edge', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'Corning', description: 'Designing the enterprise edge for massive-scale AI inference.' },
  { id: 's29', date: 'Thu, Jan 08', time: '3:00 PM-3:30 PM', topic: 'Mapping Whats Possible With AI', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'TomTom', description: 'The intersection of AI and geolocation technology in mapping.' },
  { id: 's30', date: 'Thu, Jan 08', time: '3:30 PM-4:00 PM', topic: 'AI and Aging: Designing for Longevity', location: 'Fontainebleau, Level 4, Azure Ballroom, Breakthrough Stage', speaker: 'AARP', description: 'Designing for personalization and longevity in an AI-driven world.' },
  { id: 's31', date: 'Thu, Jan 08', time: '4:00 PM-4:30 PM', topic: 'Leading AI at Scale: Success Factors', location: 'Fontainebleau, Level 4, Azure Ballroom, Discovery Stage', speaker: 'JobsOhio', description: 'Economic factors for growth and leadership in the emerging AI economy.' }
];

export const CES_EVENTS: CESEvent[] = [
  { id: 'ev1', date: 'Mon, Jan 5', time: '5:00 PM PST', title: 'CES Crypto Happy Hour 2026', location: 'Vegas Crypto Group', access: 'Free' },
  { id: 'ev2', date: 'Mon, Jan 5', time: '7:00 PM PST', title: 'CES System Integrator Meet Up', location: 'Rockhouse, 3377 S Las Vegas Blvd (Venetian)', access: 'Free' },
  { id: 'ev3', date: 'Tue, Jan 6', time: '5:00 PM PST', title: 'SWARM Happy Hour', location: "Jason Aldean's Kitchen + Bar", access: 'Free' },
  { id: 'ev4', date: 'Tue, Jan 6', time: '6:00 PM PST', title: 'COVESA Networking Reception', location: 'Bellagio Ballroom, Bellagio Hotel', description: 'Annual automotive technology networking reception featuring 70+ unique tables and vehicles.', access: 'Free' },
  { id: 'ev5', date: 'Tue, Jan 6', time: '6:00 PM PST', title: 'Silicon Dragon CES 2026', location: 'Silicon Dragon Venue', access: 'Paid' },
  { id: 'ev6', date: 'Tue, Jan 6', time: '6:00 PM PST', title: '🎰 New Friendship Tech CES VEGAS', location: 'Members Only Club, 63rd Floor Rooftop Lounge', access: 'Invitation Only' },
  { id: 'ev7', date: 'Tue, Jan 6', time: '7:00 PM PST', title: 'UFB: Humanoids vs Vegas', location: 'BattleBots Arena', description: 'Live robot combat sports. Humanoid robots and elite pilots collide in a high-adrenaline showdown.', access: 'Paid' },
  { id: 'ev8', date: 'Tue, Jan 6', time: '7:00 PM PST', title: 'The Supper Club', location: 'Unplugged Collective', access: 'Invitation Only' },
  { id: 'ev9', date: 'Tue, Jan 6', time: '7:00 PM PST', title: 'Dinner & Deal Flow: CES', location: 'Cosmopolitan', access: 'Invitation Only' },
  { id: 'ev10', date: 'Tue, Jan 6', time: '7:00 PM PST', title: 'Dinner & Deal Flow (Private)', location: 'Private Suite', access: 'Invitation Only' },
];

export const VENUE_DATA: Record<string, VenueProfile> = {
  'The Venetian Resort': {
    name: 'The Venetian Resort Las Vegas',
    rating: 4.8,
    reviews: '24,502',
    photo: 'https://images.unsplash.com/photo-1549463213-9e455910243b?auto=format&fit=crop&q=80&w=800',
    summary: 'A luxury hotel and casino resort located on the Las Vegas Strip. It is the second-largest hotel in the world, featuring grand Italian-inspired architecture, indoor canals, and world-class shopping.',
    amenities: ['Luxury Spa', 'Pool Deck', 'Fitness Center', 'Grand Canal Shoppes'],
    category: 'Hotel & Casino',
    priceLevel: '$$$$',
    address: '3355 S Las Vegas Blvd, Las Vegas, NV 89109',
    phone: '+1 702-414-1000',
    status: 'Open'
  },
  'LAS Terminal 3': {
    name: 'Harry Reid Intl Airport - Terminal 3',
    rating: 4.2,
    reviews: '12,100',
    photo: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&q=80&w=800',
    summary: 'The newest terminal at Harry Reid International Airport, serving international and domestic flights with modern amenities, duty-free shopping, and multiple lounge options.',
    amenities: ['Free Wi-Fi', 'Duty Free', 'VIP Lounges', 'Badge Pickup Hub'],
    category: 'Airport Terminal',
    priceLevel: '$$',
    address: '5757 Wayne Newton Blvd, Las Vegas, NV 89119',
    phone: '+1 702-261-5211',
    status: 'Open'
  },
  "Ruth's Chris Steak House": {
    name: "Ruth's Chris Steak House",
    rating: 4.6,
    reviews: '3,840',
    photo: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=800',
    summary: 'High-end steakhouse chain known for its signature sizzling butter-topped prime steaks served on 500-degree plates. A sophisticated atmosphere for business dinners.',
    amenities: ['Valet Parking', 'Private Dining', 'Full Bar', 'Business Casual'],
    category: 'Steakhouse',
    priceLevel: '$$$$',
    address: '3655 S Las Vegas Blvd, Las Vegas, NV 89109',
    phone: '+1 702-731-7000',
    status: 'Open'
  },
  'Venetian Expo': {
    name: 'Venetian Expo & Convention Center',
    rating: 4.7,
    reviews: '8,200',
    photo: 'https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?auto=format&fit=crop&q=80&w=800',
    summary: 'A premier convention space hosting major trade shows like CES. Featuring over 2.25 million square feet of flexible exhibit and meeting space.',
    amenities: ['Meeting Rooms', 'Catering', 'AV Services', 'Direct Hotel Access'],
    category: 'Convention Center',
    priceLevel: '$$$',
    address: '201 Sands Ave, Las Vegas, NV 89169',
    phone: '+1 702-733-5556',
    status: 'Open'
  },
  'Paris Las Vegas': {
    name: 'Paris Las Vegas Hotel & Casino',
    rating: 4.5,
    reviews: '18,900',
    photo: 'https://images.unsplash.com/photo-1581351123004-757df051db8e?auto=format&fit=crop&q=80&w=800',
    summary: 'Experience the romance of Paris in the heart of the Strip. Home to Gordon Ramsay Steak and featuring a half-scale replica of the Eiffel Tower.',
    amenities: ['Eiffel Tower View', 'Pool', 'Fine Dining', 'Casino'],
    category: 'Hotel & Casino',
    priceLevel: '$$$',
    address: '3655 S Las Vegas Blvd, Las Vegas, NV 89109',
    phone: '+1 702-946-7000',
    status: 'Open'
  },
  'Tao Nightclub @ Venetian': {
    name: 'TAO Nightclub',
    rating: 4.4,
    reviews: '5,500',
    photo: 'https://images.unsplash.com/photo-1566737236580-c824c5bb7d6e?auto=format&fit=crop&q=80&w=800',
    summary: 'A multi-level Asian-themed entertainment complex. Known for its high-energy atmosphere, celebrity sightings, and lush decor featuring a 20-foot Buddha statue.',
    amenities: ['VIP Tables', 'Dance Floor', 'Outdoor Terrace', 'Bottle Service'],
    category: 'Nightclub',
    priceLevel: '$$$$',
    address: '3377 S Las Vegas Blvd, Las Vegas, NV 89109',
    phone: '+1 702-388-8338',
    status: 'Open'
  },
  'Las Vegas Hilton (Westgate)': {
    name: 'Westgate Las Vegas Resort & Casino',
    rating: 4.1,
    reviews: '15,600',
    photo: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80&w=800',
    summary: 'Formerly the Las Vegas Hilton, this legendary resort features the world\'s largest race & sports book and hosts specialized showrooms for CES.',
    amenities: ['SuperBook', 'Showrooms', 'Monorail Station', 'Fine Dining'],
    category: 'Hotel & Casino',
    priceLevel: '$$',
    address: '3000 Paradise Rd, Las Vegas, NV 89109',
    phone: '+1 702-732-5111',
    status: 'Open'
  },
  'LVCC North Hall': {
    name: 'Las Vegas Convention Center',
    rating: 4.6,
    reviews: '14,200',
    photo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
    summary: 'One of the largest convention centers in the world. The North Hall is a primary hub for automotive and electronics exhibits during CES.',
    amenities: ['Food Court', 'Business Center', 'Loop Transit', 'Event Spaces'],
    category: 'Convention Center',
    priceLevel: '$$$',
    address: '3150 Paradise Rd, Las Vegas, NV 89109',
    phone: '+1 702-892-0711',
    status: 'Open'
  }
};

export const INITIAL_ITINERARY: ItineraryItem[] = [
  {
    id: '1',
    date: '2026-01-05',
    time: '17:00',
    title: 'Arrival: Flight AA123',
    location: 'LAS Terminal 3',
    description: 'Arrival at Las Vegas Harry Reid International Airport.',
    type: 'flight',
    coordinates: { lat: 36.084, lng: -115.153 }
  },
  {
    id: '2',
    date: '2026-01-05',
    time: '17:30',
    title: 'CES Badge Pickup',
    location: 'LAS Terminal 3',
    description: 'Pick up your official CES 2026 badge immediately after arrival.',
    type: 'badge',
    coordinates: { lat: 36.084, lng: -115.153 }
  },
  {
    id: '3',
    date: '2026-01-05',
    time: '18:30',
    title: 'Hotel Check-in',
    location: 'The Venetian Resort',
    description: 'Check into your suite at The Venetian.',
    type: 'hotel',
    coordinates: { lat: 36.1212, lng: -115.1697 }
  },
  {
    id: '4',
    date: '2026-01-05',
    time: '20:30',
    title: 'Dinner @ Ruth\'s Chris',
    location: "Ruth's Chris Steak House",
    description: 'Steak dinner reservation.',
    type: 'food',
    coordinates: { lat: 36.1197, lng: -115.1721 }
  },
  {
    id: '5',
    date: '2026-01-06',
    time: '09:00',
    title: 'Venetian Ballroom Exhibits',
    location: 'Venetian Expo',
    description: 'Explore the main show floor exhibits.',
    type: 'exhibit',
    coordinates: { lat: 36.1212, lng: -115.1697 }
  },
  {
    id: '6',
    date: '2026-01-06',
    time: '14:00',
    title: 'Tech Innovation Sessions',
    location: 'Venetian Expo',
    description: 'Attend curated sessions on emerging technologies.',
    type: 'session'
  },
  {
    id: '7',
    date: '2026-01-06',
    time: '18:30',
    title: 'Dinner @ Gordon Ramsay Steak',
    location: 'Paris Las Vegas',
    description: 'Fine dining experience.',
    type: 'food',
    coordinates: { lat: 36.1125, lng: -115.1707 }
  },
  {
    id: '8',
    date: '2026-01-06',
    time: '21:00',
    title: 'Radio Shack Private Party',
    location: 'Tao Nightclub @ Venetian',
    description: 'Exclusive after-hours networking event.',
    type: 'party',
    coordinates: { lat: 36.1212, lng: -115.1697 }
  },
  {
    id: '9',
    date: '2026-01-09',
    time: '10:00',
    title: 'LVH Showroom Exploration',
    location: 'Las Vegas Hilton (Westgate)',
    description: 'Visit the specialized showrooms at the LVH.',
    type: 'exhibit',
    coordinates: { lat: 36.136, lng: -115.151 }
  },
  {
    id: '10',
    date: '2026-01-09',
    time: '12:30',
    title: 'Lunch @ Exhibit Hall',
    location: 'LVCC North Hall',
    description: 'Quick lunch before departure.',
    type: 'food',
    coordinates: { lat: 36.131, lng: -115.151 }
  },
  {
    id: '11',
    date: '2026-01-09',
    time: '15:30',
    title: 'Airport Transfer',
    location: 'The Venetian to LAS',
    description: 'Depart from hotel to Harry Reid International Airport.',
    type: 'flight'
  }
];
