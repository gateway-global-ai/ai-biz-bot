import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail, Phone, Building2, Calendar, User, MessageSquare,
  CheckCircle2, Clock, AlertCircle, XCircle, Loader2,
  Eye, Edit, Trash2, Filter, Search, RefreshCw,
} from "lucide-react";
import type { Inquiry } from "@shared/schema";
import { format } from "date-fns";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: any }> = {
    new: { color: "bg-blue-600 border-blue-500", icon: AlertCircle },
    viewed: { color: "bg-yellow-600 border-yellow-500", icon: Eye },
    in_progress: { color: "bg-purple-600 border-purple-500", icon: Clock },
    resolved: { color: "bg-emerald-600 border-emerald-500", icon: CheckCircle2 },
    closed: { color: "bg-slate-600 border-slate-500", icon: XCircle },
  };
  const s = map[status] || map.new;
  const Icon = s.icon;
  return (
    <Badge className={s.color}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace("_", " ")}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: "border-slate-600 text-slate-400",
    normal: "border-blue-600 text-blue-400",
    high: "border-orange-600 text-orange-400",
    urgent: "border-red-600 text-red-400",
  };
  return <Badge variant="outline" className={map[priority] || map.normal}>{priority}</Badge>;
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { color: string; icon: any }> = {
    website: { color: "border-blue-600 text-blue-400", icon: MessageSquare },
    chat: { color: "border-purple-600 text-purple-400", icon: MessageSquare },
    phone: { color: "border-green-600 text-green-400", icon: Phone },
    email: { color: "border-yellow-600 text-yellow-400", icon: Mail },
    sms: { color: "border-teal-600 text-teal-400", icon: MessageSquare },
  };
  const s = map[source] || map.website;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={s.color}>
      <Icon className="w-3 h-3 mr-1" />
      {source}
    </Badge>
  );
}

function InquiryStats() {
  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["/api/inquiries/stats"] });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>;
  if (!stats) return null;

  const statCards = [
    { label: "Total", value: stats.total, color: "text-blue-400" },
    { label: "New", value: stats.new, color: "text-yellow-400" },
    { label: "In Progress", value: stats.inProgress, color: "text-purple-400" },
    { label: "Resolved", value: stats.resolved, color: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {statCards.map((s) => (
        <Card key={s.label} className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InquiryDetailDialog({ 
  inquiry, 
  open, 
  onClose 
}: { 
  inquiry: Inquiry | null; 
  open: boolean; 
  onClose: () => void;
}) {
  const [status, setStatus] = useState(inquiry?.status || "new");
  const [priority, setPriority] = useState(inquiry?.priority || "normal");
  const [response, setResponse] = useState(inquiry?.response || "");
  const [internalNotes, setInternalNotes] = useState(inquiry?.internalNotes || "");
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!inquiry) return;
      const res = await apiRequest("PATCH", `/api/inquiries/${inquiry.id}`, {
        status,
        priority,
        response,
        internalNotes,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Inquiry updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries/stats"] });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!inquiry) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            Inquiry Details
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Submitted {format(new Date(inquiry.createdAt), "PPpp")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Customer Info */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-sm text-slate-300">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-white font-medium">{inquiry.name}</span>
              </div>
              {inquiry.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${inquiry.email}`} className="text-blue-400 hover:underline">
                    {inquiry.email}
                  </a>
                </div>
              )}
              {inquiry.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href={`tel:${inquiry.phone}`} className="text-emerald-400 hover:underline">
                    {inquiry.phone}
                  </a>
                </div>
              )}
              {inquiry.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{inquiry.company}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inquiry Details */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-sm text-slate-300">Inquiry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {inquiry.subject && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Subject</p>
                  <p className="text-white">{inquiry.subject}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Message</p>
                <p className="text-slate-300 whitespace-pre-wrap">{inquiry.message}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <SourceBadge source={inquiry.source || 'website'} />
                <StatusBadge status={status} />
                <PriorityBadge priority={priority} />
              </div>
            </CardContent>
          </Card>

          {/* Update Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Response</label>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Enter your response to the customer..."
                className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Internal Notes</label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes (not visible to customer)..."
                className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
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
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InquiryManagement() {
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: inquiries = [], isLoading, refetch } = useQuery<Inquiry[]>({
    queryKey: ["/api/inquiries", { status: statusFilter, priority: priorityFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      const res = await apiRequest("GET", `/api/inquiries?${params.toString()}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/inquiries/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Inquiry deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries/stats"] });
    },
  });

  const filteredInquiries = inquiries.filter((inquiry) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inquiry.name.toLowerCase().includes(term) ||
      inquiry.email?.toLowerCase().includes(term) ||
      inquiry.phone?.toLowerCase().includes(term) ||
      inquiry.message.toLowerCase().includes(term) ||
      inquiry.subject?.toLowerCase().includes(term)
    );
  });

  const handleViewInquiry = async (inquiry: Inquiry) => {
    try {
      const res = await apiRequest("GET", `/api/inquiries/${inquiry.id}`);
      const freshInquiry: Inquiry = await res.json();
      setSelectedInquiry(freshInquiry);
      setDetailOpen(true);
      // Ensure list and stats reflect any server-side "viewed" updates
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries/stats"] });
    } catch (error) {
      // Fallback to existing data if the fresh fetch fails
      setSelectedInquiry(inquiry);
      setDetailOpen(true);
      toast({
        title: "Error",
        description: "Failed to load the latest inquiry details.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 min-h-screen bg-slate-950">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2 mb-2">
          <MessageSquare className="w-8 h-8 text-purple-400" />
          Inquiry Management
        </h1>
        <p className="text-slate-400">
          View and manage customer inquiries from your website, chat, and other channels
        </p>
      </div>

      <InquiryStats />

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700 mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Search inquiries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="border-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">No inquiries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Customer</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Subject</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Source</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Status</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Priority</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Date</th>
                    <th className="text-left p-4 text-xs text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => handleViewInquiry(inquiry)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">{inquiry.name}</p>
                          {inquiry.email && (
                            <p className="text-xs text-slate-400">{inquiry.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-300 truncate max-w-xs">
                          {inquiry.subject || inquiry.message.substring(0, 50)}...
                        </p>
                      </td>
                      <td className="p-4">
                        <SourceBadge source={inquiry.source || 'website'} />
                      </td>
                      <td className="p-4">
                        <StatusBadge status={inquiry.status || 'new'} />
                      </td>
                      <td className="p-4">
                        <PriorityBadge priority={inquiry.priority || 'normal'} />
                      </td>
                      <td className="p-4 text-slate-400 text-sm">
                        {inquiry.createdAt ? format(new Date(inquiry.createdAt), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInquiry(inquiry);
                            }}
                            className="border-slate-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this inquiry?")) {
                                deleteMutation.mutate(inquiry.id);
                              }
                            }}
                            className="border-red-700 text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InquiryDetailDialog
        inquiry={selectedInquiry}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedInquiry(null);
        }}
      />
    </div>
  );
}
