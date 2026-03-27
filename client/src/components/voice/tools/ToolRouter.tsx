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
import { KioskOnboarding } from './KioskOnboarding';
import { PlanManager } from './PlanManager';
import { SharedCanvasPanel } from './SharedCanvasPanel';
import { pickInitialManualValue } from '@/lib/intakePrefillFromContext';
import type { CanvasRenderPayload } from '../../../../../shared/canvasViewContract';

interface ToolRouterProps {
  toolType: string;
  metadata: any;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onTriggerSpeech?: (text: string) => void;
  onContextUpdate?: (context: string) => void;
}

export const ToolRouter: React.FC<ToolRouterProps> = ({ 
  toolType, 
  metadata, 
  onSubmit, 
  onCancel,
  onTriggerSpeech,
  onContextUpdate
}) => {
  switch (toolType) {
    case 'manual_input':
    case 'request_manual_input':
      return (
        <ManualDataInput 
          prompt={metadata.prompt || "Please enter the requested information:"}
          onSubmit={onSubmit}
          onCancel={onCancel}
          initialValue={pickInitialManualValue(metadata)}
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
    case 'kiosk_onboarding':
      return <KioskOnboarding onSubmit={onSubmit} onTriggerSpeech={onTriggerSpeech} onContextUpdate={onContextUpdate} siteConfigId={metadata.siteConfigId} />;
    case 'manage_pricing_plans':
      return (
        <PlanManager 
          siteConfigId={metadata.siteConfigId} 
          onClose={onCancel}
          onTriggerSpeech={onTriggerSpeech}
        />
      );
    case 'shared_canvas':
    case 'show_canvas': // LEGACY ADAPTER — routes to SharedCanvasPanel; will be removed after p5-deprecate
      console.warn('[ToolRouter] DEPRECATED path: tool_type', toolType, '— migrate to canvas_control syscall');
      return (
        <SharedCanvasPanel
          metadata={metadata}
          onTriggerSpeech={onTriggerSpeech}
          onContextUpdate={onContextUpdate}
          onCancel={onCancel}
        />
      );
    case 'canvas_control': {
      // New governed path — payload is a CanvasRenderPayload via CanvasSyscallEnvelope
      const renderPayload = metadata as CanvasRenderPayload | null;
      if (!renderPayload?.viewId) {
        console.warn('[ToolRouter] canvas_control: missing viewId in payload');
        return null;
      }
      // Render via SharedCanvasPanel with typed data until CanvasRuntimeRenderer is wired
      return (
        <SharedCanvasPanel
          metadata={{ ...renderPayload, canvas_type: renderPayload.viewId, tool_type: 'canvas_control' }}
          onTriggerSpeech={onTriggerSpeech}
          onContextUpdate={onContextUpdate}
          onCancel={onCancel}
        />
      );
    }
    default:
      console.warn(`[ToolRouter] Unknown tool type: ${toolType}`);
      return null;
  }
};
