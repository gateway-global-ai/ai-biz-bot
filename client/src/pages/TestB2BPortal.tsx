import React, { useState, useEffect } from 'react';
import { AgentCurationPanel } from '../components/AgentCurationPanel';

const MOCK_LEADS: any[] = [
  {
    id: 'f1',
    type: 'flight',
    title: 'Emirates • JFK → DXB',
    subtitle: '14h 20m • Nonstop',
    price: 1250,
    currency: 'USD',
    airline: 'Emirates',
    departure_id: 'JFK',
    arrival_id: 'DXB',
    duration: '14h 20m',
    stops: 0
  },
  {
    id: 'h1',
    type: 'hotel',
    title: 'Rove Expo 2020',
    subtitle: '0.2km from Expo City',
    price: 210,
    currency: 'USD',
    name: 'Rove Expo 2020',
    rating: 4.5,
    address: 'Expo City, Dubai'
  }
];

export default function TestB2BPortal() {
  const [agentMarkup, setAgentMarkup] = useState({ markup_value: 15.0, markup_type: 'percentage' });

  // Example: Loading agent preferences into the UI
  useEffect(() => {
    const loadAgentPreferences = async () => {
      try {
        const response = await fetch('http://localhost:3004/api/agent/config/1');
        if (response.ok) {
          const data = await response.json();
          setAgentMarkup(data);
        }
      } catch (error) {
        console.error("Failed to load agent preferences:", error);
      }
    };
    loadAgentPreferences();
  }, []);

  return (
    <div className="h-screen w-screen bg-slate-950">
      <div className="absolute top-4 left-4 z-50 bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 text-white text-xs">
        <p className="font-bold mb-1">B2B Session Active</p>
        <p>Markup: {agentMarkup.markup_value}{agentMarkup.markup_type === 'percentage' ? '%' : ' Fixed'}</p>
      </div>
      <AgentCurationPanel initialLeads={MOCK_LEADS} />
    </div>
  );
}
