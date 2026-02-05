import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Settings,
  Webhook,
  Phone,
  MessageSquare,
  Mic,
  Shield,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface WebhookConfig {
  sms: string;
  smsStatus: string;
  voice: string;
  voiceFallback: string;
  voiceStatus: string;
}

interface HealthService {
  sid: string;
  friendlyName: string;
  healthy: boolean;
  phoneNumbers?: string[];
}

interface TwiMLApp {
  sid: string;
  friendlyName: string;
  smsUrl?: string;
  voiceUrl?: string;
}

interface HealthData {
  allHealthy?: boolean;
  totalIssues?: number;
  services?: HealthService[];
}

interface AppsData {
  apps?: TwiMLApp[];
}

export function WebhookSettings() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [customWebhooks, setCustomWebhooks] = useState<WebhookConfig | null>(null);
  const { toast } = useToast();

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth, isError: healthError } = useQuery<HealthData>({
    queryKey: ['/api/twilio/messaging-services/health'],
    enabled: isExpanded,
  });

  const { data: appsData, isLoading: appsLoading, isError: appsError } = useQuery<AppsData>({
    queryKey: ['/api/twilio/twiml-apps'],
    enabled: isExpanded && showAdvanced,
  });

  const fixWebhooksMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/twilio/fix-all-webhooks', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fix webhooks');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Webhooks Fixed',
        description: `Updated ${data.summary?.totalFixed || 0} configurations`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/twilio'] });
      refetchHealth();
    },
    onError: (error: any) => {
      toast({
        title: 'Fix Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const currentDomain = typeof window !== 'undefined' ? window.location.host : '';
  const baseUrl = `https://${currentDomain}`;

  const defaultWebhooks: WebhookConfig = {
    sms: `${baseUrl}/webhook/sms`,
    smsStatus: `${baseUrl}/webhook/sms/status`,
    voice: `${baseUrl}/webhook/voice/kimi`,
    voiceFallback: `${baseUrl}/webhook/voice`,
    voiceStatus: `${baseUrl}/webhook/voice/status`,
  };

  const handleModifyClick = () => {
    setShowWarningDialog(true);
  };

  const handleConfirmModify = () => {
    setShowWarningDialog(false);
    setEditMode(true);
    setCustomWebhooks(defaultWebhooks);
  };

  const allHealthy = healthData?.allHealthy ?? true;
  const totalIssues = healthData?.totalIssues ?? 0;
  const services = healthData?.services ?? [];
  const apps = appsData?.apps ?? [];

  return (
    <Card className="bg-slate-900 border-slate-700">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader 
            className="cursor-pointer hover:bg-slate-800/50 transition-colors"
            data-testid="button-webhook-settings-expand"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Webhook className="w-5 h-5 text-purple-400" />
                <div>
                  <CardTitle className="text-lg text-white">Webhook Configuration</CardTitle>
                  <CardDescription className="text-slate-400">
                    View and manage Twilio webhook settings
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isExpanded && (
                  <Badge 
                    variant={allHealthy ? 'default' : 'destructive'}
                    className={allHealthy ? 'bg-green-600' : ''}
                    data-testid="badge-webhook-health"
                  >
                    {allHealthy ? 'Healthy' : `${totalIssues} Issues`}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {healthLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span className="ml-2 text-slate-400">Loading webhook status...</span>
              </div>
            ) : healthError ? (
              <div className="flex items-center justify-center py-4 text-red-400">
                <AlertTriangle className="w-5 h-5 mr-2" />
                <span>Failed to load webhook status</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {allHealthy ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    )}
                    <span className="text-sm text-slate-300">
                      {allHealthy 
                        ? 'All webhooks configured correctly' 
                        : `${totalIssues} configuration issues detected`
                      }
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refetchHealth()}
                      disabled={healthLoading}
                      data-testid="button-refresh-health"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${healthLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => fixWebhooksMutation.mutate()}
                      disabled={fixWebhooksMutation.isPending}
                      data-testid="button-fix-webhooks"
                    >
                      {fixWebhooksMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Settings className="w-4 h-4 mr-2" />
                      )}
                      Auto-Fix All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      SMS Webhooks
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Inbound SMS:</span>
                        <code className="text-xs bg-slate-700 px-2 py-1 rounded text-green-400">
                          /webhook/sms
                        </code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Status Callback:</span>
                        <code className="text-xs bg-slate-700 px-2 py-1 rounded text-green-400">
                          /webhook/sms/status
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-purple-400" />
                      Voice Webhooks
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Inbound Voice:</span>
                        <code className="text-xs bg-slate-700 px-2 py-1 rounded text-green-400">
                          /webhook/voice/kimi
                        </code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Fallback:</span>
                        <code className="text-xs bg-slate-700 px-2 py-1 rounded text-green-400">
                          /webhook/voice
                        </code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Status Callback:</span>
                        <code className="text-xs bg-slate-700 px-2 py-1 rounded text-green-400">
                          /webhook/voice/status
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-slate-400"
                      data-testid="button-toggle-advanced-webhooks"
                    >
                      {showAdvanced ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showAdvanced ? 'Hide' : 'Show'} Full URLs
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
                      <h4 className="text-sm font-medium text-white mb-3">Full Webhook URLs</h4>
                      <div className="space-y-3 text-xs font-mono">
                        {Object.entries(defaultWebhooks).map(([key, url]) => (
                          <div key={key} className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase">{key}:</span>
                            <code className="text-green-400 break-all bg-slate-900 p-2 rounded">
                              {url}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleModifyClick}
                        className="text-orange-400 border-orange-400/50 hover:bg-orange-400/10"
                        data-testid="button-modify-webhooks"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Modify Webhooks (Advanced)
                      </Button>
                    </div>

                    {services.length > 0 && (
                      <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-cyan-400" />
                          Messaging Services ({services.length})
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {services.map((svc) => (
                            <div 
                              key={svc.sid} 
                              className="flex items-center justify-between p-2 bg-slate-900/50 rounded text-xs"
                              data-testid={`row-messaging-service-${svc.sid}`}
                            >
                              <div className="flex items-center gap-2">
                                {svc.healthy ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                )}
                                <span className="text-slate-300">{svc.friendlyName}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {svc.phoneNumbers?.length || 0} numbers
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {appsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span className="ml-2 text-slate-400 text-sm">Loading TwiML Apps...</span>
                      </div>
                    ) : apps.length > 0 && (
                      <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
                        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-400" />
                          TwiML Apps ({apps.length})
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {apps.map((app) => (
                            <div 
                              key={app.sid} 
                              className="flex items-center justify-between p-2 bg-slate-900/50 rounded text-xs"
                              data-testid={`row-twiml-app-${app.sid}`}
                            >
                              <div className="flex items-center gap-2">
                                {app.smsUrl && app.voiceUrl ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                )}
                                <span className="text-slate-300">{app.friendlyName}</span>
                              </div>
                              <code className="text-xs text-slate-500">{app.sid.slice(0, 10)}...</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="bg-slate-900 border-orange-500/50">
          <DialogHeader>
            <DialogTitle className="text-orange-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Warning: Advanced Configuration
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Modifying webhook URLs can break your SMS and Voice services. 
              Only proceed if you understand what you're doing.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-300">
              <strong>Risks:</strong>
            </p>
            <ul className="text-sm text-red-300 list-disc ml-4 mt-2 space-y-1">
              <li>Incoming SMS messages will not be received</li>
              <li>Voice calls will fail to connect</li>
              <li>Status callbacks for debugging will stop</li>
              <li>AI responses will not be delivered</li>
            </ul>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowWarningDialog(false)}
              data-testid="button-cancel-modify"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmModify}
              data-testid="button-confirm-modify"
            >
              I Understand, Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
