import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone, PhoneIncoming, PhoneOutgoing, MessageSquare,
  Calendar, Clock, CheckCircle2, XCircle, PhoneMissed,
  Loader2, RefreshCw, Search, Eye, Users, Activity,
  Mail, AlertCircle
} from "lucide-react";
import { format } from "date-fns";

function LogsStats() {
  const { data: callLogs = [] } = useQuery<any[]>({ queryKey: ["/api/call-tracking"] });
  const { data: inquiries = [] } = useQuery<any[]>({ queryKey: ["/api/inquiries"] });

  const stats = [
    { label: "Total Calls", value: callLogs.length, icon: Phone, color: "text-blue-400" },
    { label: "Inquiries", value: inquiries.length, icon: MessageSquare, color: "text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-slate-400">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CallLogsPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: calls = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/call-tracking"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/call-tracking?limit=50");
      return res.json();
    },
  });

  const filteredCalls = calls.filter((call) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      call.phoneNumber?.toLowerCase().includes(term) ||
      call.customerName?.toLowerCase().includes(term) ||
      call.notes?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search calls..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-slate-700 bg-slate-900 pl-9 text-white"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()} className="border-slate-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
          <Phone className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">No call logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCalls.map((call) => (
            <Card key={call.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {call.direction === "inbound" ? (
                    <PhoneIncoming className="w-5 h-5 text-blue-400 mt-0.5" />
                  ) : (
                    <PhoneOutgoing className="w-5 h-5 text-emerald-400 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{call.phoneNumber}</span>
                      {call.customerName && (
                        <span className="text-slate-400 text-sm">• {call.customerName}</span>
                      )}
                    </div>
                    {call.notes && (
                      <p className="text-slate-400 text-sm mb-1 line-clamp-1">{call.notes}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {call.timestamp ? format(new Date(call.timestamp), "MMM d, h:mm a") : "Unknown"}
                      </span>
                      {call.duration > 0 && <span>{call.duration}s</span>}
                      <Badge variant="outline" className="text-xs">
                        {call.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InquiriesPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: inquiries = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/inquiries"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/inquiries?limit=50");
      return res.json();
    },
  });

  const filteredInquiries = inquiries.filter((inq) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inq.name?.toLowerCase().includes(term) ||
      inq.email?.toLowerCase().includes(term) ||
      inq.message?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search inquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white flex-1 pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()} className="border-slate-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">No inquiries found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInquiries.map((inq) => (
            <Card key={inq.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{inq.name}</span>
                      {inq.email && (
                        <span className="text-slate-400 text-sm">• {inq.email}</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mb-1 line-clamp-2">{inq.message}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(inq.createdAt), "MMM d, h:mm a")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {inq.status || 'new'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {inq.source || 'website'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TransparencyDashboard() {
  return (
    <div className="p-6 min-h-screen bg-slate-950">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2 mb-2">
          <Activity className="w-8 h-8 text-purple-400" />
          Transparency Dashboard
        </h1>
        <p className="text-slate-400">
          Monitor all activity across calls, inquiries, and outbound campaigns
        </p>
      </div>

      <LogsStats />

      <Card className="bg-slate-800/50 border-slate-700">
        <Tabs defaultValue="calls" className="w-full">
          <CardHeader>
            <TabsList className="bg-slate-900 border-slate-700">
              <TabsTrigger value="calls" className="data-[state=active]:bg-slate-700">
                <Phone className="w-4 h-4 mr-2" />
                Call Logs
              </TabsTrigger>
              <TabsTrigger value="inquiries" className="data-[state=active]:bg-slate-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                Inquiries
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            <TabsContent value="calls">
              <CallLogsPanel />
            </TabsContent>

            <TabsContent value="inquiries">
              <InquiriesPanel />
            </TabsContent>

          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
