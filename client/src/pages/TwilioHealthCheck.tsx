import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Wrench,
  Phone,
  Globe,
  Shield,
  Zap
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WebhookStatus {
  reachable: boolean;
  status?: number;
  error?: string;
}

interface MessagingService {
  sid: string;
  friendlyName: string;
  inboundRequestUrl: string | null;
  inboundMethod: string;
  fallbackUrl: string | null;
  fallbackMethod: string;
  statusCallback: string | null;
  useInboundWebhookOnNumber: boolean;
  phoneNumbers: string[];
  webhookStatus: WebhookStatus | null;
  issues: string[];
  warnings: string[];
  healthy: boolean;
}

interface HealthCheckResult {
  timestamp: string;
  servicesCount: number;
  totalIssues: number;
  totalWarnings: number;
  allHealthy: boolean;
  services: MessagingService[];
}

interface AutoFixResult {
  baseUrl: string;
  results: {
    sid: string;
    friendlyName: string;
    fixed: boolean;
    newInboundUrl?: string;
    error?: string;
    reason?: string;
  }[];
  fixedCount: number;
}

export default function TwilioHealthCheck() {
  const { toast } = useToast();
  const [lastCheck, setLastCheck] = useState<HealthCheckResult | null>(null);

  const healthCheckQuery = useQuery<HealthCheckResult>({
    queryKey: ["/api/twilio/messaging-services/health"],
    enabled: false,
    staleTime: 0,
  });

  const runHealthCheck = async () => {
    const result = await healthCheckQuery.refetch();
    if (result.data) {
      setLastCheck(result.data);
    }
  };

  const autoFixMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/twilio/messaging-services/auto-fix");
      return response.json() as Promise<AutoFixResult>;
    },
    onSuccess: (data) => {
      toast({
        title: "Repair Complete",
        description: `Fixed ${data.fixedCount} messaging service(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/twilio/messaging-services/health"] });
      runHealthCheck();
    },
    onError: (error: Error) => {
      toast({
        title: "Repair Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fixSingleService = useMutation({
    mutationFn: async ({ sid, inboundRequestUrl }: { sid: string; inboundRequestUrl: string }) => {
      const response = await apiRequest("PATCH", `/api/twilio/messaging-services/${sid}`, {
        inboundRequestUrl,
        inboundMethod: "POST",
        fallbackUrl: inboundRequestUrl,
        fallbackMethod: "POST",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Service Updated",
        description: "Webhook URL has been fixed",
      });
      runHealthCheck();
    },
    onError: (error: Error) => {
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (service: MessagingService) => {
    if (service.issues.length > 0) return "destructive";
    if (service.warnings.length > 0) return "secondary";
    return "default";
  };

  const getStatusIcon = (service: MessagingService) => {
    if (service.issues.length > 0) return <XCircle className="h-5 w-5 text-destructive" />;
    if (service.warnings.length > 0) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const currentDomain = window.location.origin;
  const webhookUrl = `${currentDomain}/webhook/sms`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            SMS Health Check
          </h1>
          <p className="text-muted-foreground mt-1">
            Diagnose and repair Twilio Messaging Service configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runHealthCheck}
            disabled={healthCheckQuery.isFetching}
            data-testid="button-run-health-check"
          >
            {healthCheckQuery.isFetching ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Run Health Check
          </Button>
          <Button
            variant="outline"
            onClick={() => autoFixMutation.mutate()}
            disabled={autoFixMutation.isPending || !lastCheck}
            data-testid="button-auto-fix-all"
          >
            {autoFixMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wrench className="h-4 w-4 mr-2" />
            )}
            Auto-Fix All
          </Button>
        </div>
      </div>

      {lastCheck && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Services</p>
                    <p className="text-2xl font-bold">{lastCheck.servicesCount}</p>
                  </div>
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Critical Issues</p>
                    <p className="text-2xl font-bold text-destructive">{lastCheck.totalIssues}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Warnings</p>
                    <p className="text-2xl font-bold text-yellow-500">{lastCheck.totalWarnings}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-2xl font-bold">
                      {lastCheck.allHealthy ? (
                        <span className="text-green-500">Healthy</span>
                      ) : (
                        <span className="text-destructive">Issues Found</span>
                      )}
                    </p>
                  </div>
                  {lastCheck.allHealthy ? (
                    <Shield className="h-8 w-8 text-green-500" />
                  ) : (
                    <Zap className="h-8 w-8 text-destructive" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Messaging Services</CardTitle>
              <CardDescription>
                Last checked: {new Date(lastCheck.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastCheck.services.map((service) => (
                <Card key={service.sid} className="hover-elevate">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(service)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{service.friendlyName}</h3>
                            <Badge variant={getStatusColor(service)} className="text-xs">
                              {service.issues.length > 0 ? "Critical" : service.warnings.length > 0 ? "Warning" : "Healthy"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-1">{service.sid}</p>
                          
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-32">Inbound URL:</span>
                              {service.inboundRequestUrl ? (
                                <span className="font-mono text-xs truncate">{service.inboundRequestUrl}</span>
                              ) : (
                                <span className="text-yellow-500 italic">Not configured</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-32">Fallback URL:</span>
                              {service.fallbackUrl ? (
                                <span className="font-mono text-xs truncate">{service.fallbackUrl}</span>
                              ) : (
                                <span className="text-yellow-500 italic">Not configured</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-32">Use Phone Webhook:</span>
                              <span>{service.useInboundWebhookOnNumber ? "Yes" : "No"}</span>
                            </div>
                            {service.webhookStatus && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-32">Webhook Test:</span>
                                {service.webhookStatus.reachable ? (
                                  <Badge variant="default" className="bg-green-500">
                                    HTTP {service.webhookStatus.status}
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    Unreachable: {service.webhookStatus.error}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {service.phoneNumbers.length > 0 && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground w-32">Phone Numbers:</span>
                                <div className="flex flex-wrap gap-1">
                                  {service.phoneNumbers.map((pn) => (
                                    <Badge key={pn} variant="outline" className="text-xs">
                                      <Phone className="h-3 w-3 mr-1" />
                                      {pn}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {(service.issues.length > 0 || service.warnings.length > 0) && (
                            <div className="mt-3 space-y-1">
                              {service.issues.map((issue, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                                  <XCircle className="h-4 w-4 shrink-0" />
                                  {issue}
                                </div>
                              ))}
                              {service.warnings.map((warning, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-yellow-600">
                                  <AlertTriangle className="h-4 w-4 shrink-0" />
                                  {warning}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {service.issues.length > 0 && (
                        <Button
                          size="sm"
                          onClick={() => fixSingleService.mutate({ 
                            sid: service.sid, 
                            inboundRequestUrl: webhookUrl 
                          })}
                          disabled={fixSingleService.isPending}
                          data-testid={`button-fix-${service.sid}`}
                        >
                          <Wrench className="h-4 w-4 mr-1" />
                          Fix
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {!lastCheck && !healthCheckQuery.isFetching && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Health Check Run Yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Run Health Check" to diagnose your Twilio Messaging Services
            </p>
            <Button onClick={runHealthCheck} data-testid="button-start-health-check">
              <Activity className="h-4 w-4 mr-2" />
              Run Health Check
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
