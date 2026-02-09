
import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { DiscProfile, ArchProfile } from '../types';
import { COLORS } from '../constants';

export const DiscRadar: React.FC<{ data: DiscProfile }> = ({ data }) => {
  const radarData = [
    { subject: 'D', fullSubject: 'Dominance', A: data.dominance, fullMark: 100 },
    { subject: 'I', fullSubject: 'Influence', A: data.influence, fullMark: 100 },
    { subject: 'S', fullSubject: 'Steadiness', A: data.steadiness, fullMark: 100 },
    { subject: 'C', fullSubject: 'Conscientiousness', A: data.conscientiousness, fullMark: 100 },
  ];

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
          <Radar
            name="Profile"
            dataKey="A"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ArchBreakdown: React.FC<{ data: ArchProfile }> = ({ data }) => {
  const barData = [
    { name: 'Acknowledge', short: 'A', value: data.acknowledge, color: COLORS.A },
    { name: 'Reflect', short: 'R', value: data.reflect, color: COLORS.R },
    { name: 'Context', short: 'Cx', value: data.context, color: COLORS.Cx },
    { name: 'Handoff', short: 'H', value: data.handoff, color: COLORS.H },
  ];

  return (
    <div className="h-40 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} layout="vertical" margin={{ left: -20, right: 10 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis dataKey="short" type="category" width={40} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '10px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
