import React from 'react';
import { MapTool } from '../maps/MapTool';
import { PlaceDetailsPanel } from '../maps/PlaceDetailsPanel';
import { ManualDataInput } from './ManualDataInput';
import { MapSkeleton } from '../animations/MapSkeleton';
import { DashboardCard, BusinessIntelligenceData } from '../tour/DashboardCard';
import { TourRunner, TourSpec } from '../tour/TourRunner';
import { HotelResultsPanel, HotelResultsPanelData } from './HotelResultsPanel';
import { HotelInventoryGrid } from './HotelInventoryGrid';
import WarrantResultsPanel, { WarrantResultsData } from './WarrantResultsPanel';

interface ToolRouterProps {
  toolType: string;
  metadata: any;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onTriggerSpeech?: (text: string) => void;
}

export const ToolRouter: React.FC<ToolRouterProps> = ({ 
  toolType, 
  metadata, 
  onSubmit, 
  onCancel,
  onTriggerSpeech
}) => {
  switch (toolType) {
    case 'manual_input':
    case 'request_manual_input':
      return (
        <ManualDataInput 
          prompt={metadata.prompt || "Please enter the requested information:"}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case 'get_business_details':
      return <PlaceDetailsPanel placeId={metadata.placeId} />;
    case 'get_business_intelligence':
      return <DashboardCard data={metadata as BusinessIntelligenceData} onTriggerSpeech={onTriggerSpeech ?? (() => {})} />;
    case 'enrich_hotels_with_rates':
    case 'search_hotels':
      return <HotelResultsPanel data={metadata as HotelResultsPanelData} />;
    case 'hotel_inventory':
      return (
        <HotelInventoryGrid
          data={metadata?.data ?? {}}
          checkIn={metadata?.checkIn}
          checkOut={metadata?.checkOut}
        />
      );
    case 'warrant_results':
    case 'fetch_city_warrants':
      return <WarrantResultsPanel data={metadata as WarrantResultsData} />;
    default:
      console.warn(`[ToolRouter] Unknown tool type: ${toolType}`);
      return null;
  }
};
