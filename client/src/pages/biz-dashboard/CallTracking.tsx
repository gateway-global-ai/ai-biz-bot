import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Phone, PhoneIncoming, PhoneOutgoing, MessageSquare, User,
  Calendar, Clock, CheckCircle2, XCircle, PhoneMissed,
  Loader2, RefreshCw, Search, Plus, Edit, Mail,
} from "lucide-react";
import type { CallLog, Customer } from "@shared/schema";
import { format } from "date-fns";

function CallStatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: any }> = {
    completed: { color: "bg-emerald-600 border-emerald-500", icon: CheckCircle2 },
    missed: { color: "bg-yellow-600 border-yellow-500", icon: PhoneMissed },
    blocked: { color: "bg-red-600 border-red-500", icon: XCircle },
    failed: { color: "bg-red-600 border-red-500", icon: XCircle },
  };
  const s = map[status] || { color: "bg-slate-600 border-slate-500", icon: Phone };
  const Icon = s.icon;
  return (
    <Badge className={s.color}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

function CallDetailDialog({
  call,
  open,
  onClose,
}: {
  call: any | null;
  open: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(call?.notes || "");
  const [customerName, setCustomerName] = useState(call?.customerName || "");
  const [customerEmail, setCustomerEmail] = useState(call?.customerEmail || "");
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!call) return;
      // Update call log with notes and customer info
      const res = await apiRequest("PATCH", `/api/telephony/calls/${call.id}`, {
        notes,
        customerName,
        customerEmail,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Call notes updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-tracking"] });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!call) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Phone className="w-5 h-5 text-purple-400" />
            Call Details
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {(call.timestamp || call.callStart || call.callEnd)
              ? format(new Date(call.timestamp || call.callStart || call.callEnd), "PPpp")
              : "No date recorded"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Call Info */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-sm text-slate-300">Call Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                {call.direction === "inbound" ? (
                  <PhoneIncoming className="w-4 h-4 text-blue-400" />
                ) : (
                  <PhoneOutgoing className="w-4 h-4 text-emerald-400" />
                )}
                <span className="text-white font-medium">
                  {call.direction === "inbound" ? "Inbound" : "Outbound"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-white">{call.phoneNumber}</span>
                {call.customerName ? (
                  <Badge className="bg-emerald-600 border-emerald-500">Known Customer</Badge>
                ) : (
                  <Badge className="bg-amber-600 border-amber-500">Unknown Caller</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">
                  Duration: {call.duration ? `${call.duration}s` : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CallStatusBadge status={call.status} />
              </div>
              {call.recordingUrl && (
                <div className="mt-2">
                  <a
                    href={call.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-sm"
                  >
                    🎧 Listen to Recording
                  </a>
                </div>
              )}
              {typeof call.notes === "string" && call.notes.startsWith("[Twilio Caller]") ? (
                <div className="mt-2 text-xs text-slate-300">{call.notes}</div>
              ) : null}
            </CardContent>
          </Card>

          {/* Customer Details */}
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Customer Name</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Customer Email</label>
              <Input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter customer email..."
                type="email"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Call Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this call..."
                className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700">
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CallTracking() {
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: calls = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/call-tracking"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/call-tracking?limit=100");
      return res.json();
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
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

  const handleViewCall = (call: any) => {
    setSelectedCall(call);
    setDetailOpen(true);
  };

  const stats = {
    total: calls.length,
    completed: calls.filter((c) => c.status === "completed").length,
    missed: calls.filter((c) => c.status === "missed").length,
    inbound: calls.filter((c) => c.direction === "inbound").length,
    outbound: calls.filter((c) => c.direction === "outbound").length,
  };

  return (
    <div className="p-6 min-h-screen bg-slate-950">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2 mb-2">
          <Phone className="w-8 h-8 text-purple-400" />
          Call Tracking
        </h1>
        <p className="text-slate-400">
          Track and manage all phone calls with customer details and notes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Calls", value: stats.total, color: "text-blue-400" },
          { label: "Completed", value: stats.completed, color: "text-emerald-400" },
          { label: "Missed", value: stats.missed, color: "text-yellow-400" },
          { label: "Inbound", value: stats.inbound, color: "text-purple-400" },
          { label: "Outbound", value: stats.outbound, color: "text-cyan-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="bg-slate-800/50 border-slate-700 mb-6">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by phone number, customer name, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-slate-700 bg-slate-900 pl-9 text-white"
              />
            </div>
            <Button variant="outline" onClick={() => refetch()} className="border-slate-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">No calls found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Type</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Phone Number</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Customer</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Duration</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Status</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Date</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Notes</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((call) => (
                    <tr
                      key={call.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => handleViewCall(call)}
                    >
                      <td className="p-4">
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="w-5 h-5 text-blue-400" />
                        ) : (
                          <PhoneOutgoing className="w-5 h-5 text-emerald-400" />
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-white font-medium">
                          {call.phoneNumber || "Unknown"}
                        </p>
                      </td>
                      <td className="p-4">
                        {call.customerName ? (
                          <div>
                            <p className="text-white text-sm">{call.customerName}</p>
                            {call.customerEmail && (
                              <p className="text-xs text-slate-400">{call.customerEmail}</p>
                            )}
                            <Badge className="mt-1 bg-emerald-600 border-emerald-500">Known Customer</Badge>
                          </div>
                        ) : (
                          <Badge className="bg-amber-600 border-amber-500">Unknown Caller</Badge>
                        )}
                      </td>
                      <td className="p-4 text-slate-300">
                        {call.duration ? `${call.duration}s` : "-"}
                      </td>
                      <td className="p-4">
                        <CallStatusBadge status={call.status} />
                      </td>
                      <td className="p-4 text-slate-400 text-sm">
                        {(call.timestamp || call.callStart || call.callEnd)
                          ? format(new Date(call.timestamp || call.callStart || call.callEnd), "MMM d, yyyy h:mm a")
                          : "—"}
                      </td>
                      <td className="p-4">
                        {call.notes ? (
                          <p className="text-slate-300 text-sm truncate max-w-xs">
                            {call.notes}
                          </p>
                        ) : (
                          <p className="text-slate-500 text-sm">No notes</p>
                        )}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCall(call);
                          }}
                          className="border-slate-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CallDetailDialog
        call={selectedCall}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedCall(null);
        }}
      />
    </div>
  );
}
