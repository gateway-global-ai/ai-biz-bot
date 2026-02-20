import React from 'react';
import { MapTool } from '../maps/MapTool';
import { PlaceDetailsPanel } from '../maps/PlaceDetailsPanel';
import { ManualDataInput } from './ManualDataInput';
import { MapSkeleton } from '../animations/MapSkeleton';
import { DashboardCard, BusinessIntelligenceData } from '../tour/DashboardCard';
import { TourRunner, TourSpec } from '../tour/TourRunner';

interface ToolRouterProps {
  toolType: string;
  metadata: any;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const ToolRouter: React.FC<ToolRouterProps> = ({ 
  toolType, 
  metadata, 
  onSubmit, 
  onCancel 
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
      return <PlaceDetailsPanel data={metadata} />;
    case 'get_business_intelligence':
      return <DashboardCard data={metadata as BusinessIntelligenceData} />;
    default:
      console.warn(`[ToolRouter] Unknown tool type: ${toolType}`);
      return null;
  }
};
