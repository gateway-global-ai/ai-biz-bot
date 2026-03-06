import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  Shield, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building2,
  CalendarCheck,
  CalendarX,
  Percent,
  BedDouble,
  BarChart3,
  PieChartIcon,
  RefreshCw,
  LogOut,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Wrench,
  Home,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ClipboardList
} from "lucide-react";

interface DashboardMetrics {
  arrivals: number;
  departures: number;
  stayovers: number;
  inHouse: number;
  available: number;
  totalRooms: number;
  occupancyRate: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  roomNights: number;
  adr: number;
  revpar: number;
  occupancy: number;
}

interface RevenueByRoomType {
  roomType: string;
  revenue: number;
  bookings: number;
  percentage: number;
}

interface HousekeepingSummary {
  vacantDirty: number;
  vacantClean: number;
  occupied: number;
  outOfService: number;
  offline: number;
}

interface InternalRoom {
  id: string;
  unitNumber: string;
  unitDescription: string | null;
  condition: string;
  isOffline: boolean;
  offlineReason: string | null;
  notes: string | null;
  media: { type: string; url: string; caption?: string }[];
  tasks?: RoomTask[];
}

interface RoomTask {
  id: string;
  roomId: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assignedTo: string | null;
  dueDate: string | null;
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function InvestorPortal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [, setLocation] = useLocation();
  
  // Determine if authenticated via admin key or investor session
  const isAuthenticated = auth.isAdmin || auth.isInvestor;
  
  // Phone+OTP login state
  const [loginStep, setLoginStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [investorName, setInvestorName] = useState(auth.investorName || "");
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkVerifying, setMagicLinkVerifying] = useState(false);
  
  // Handle magic link token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get("token");
    
    if (magicToken && !isAuthenticated && !magicLinkVerifying) {
      setMagicLinkVerifying(true);
      
      // Verify the magic link token
      fetch("/api/investor/verify-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: magicToken })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Store the session token via shared auth context
            auth.loginAsInvestor(data.sessionToken, data.investor.name);
            setInvestorName(data.investor.name);
            toast({ title: "Welcome", description: `Welcome to the Investor Portal, ${data.investor.name}!` });
            // Remove token from URL
            setLocation("/investor");
          } else {
            toast({ 
              title: "Link Invalid", 
              description: data.error || "This link has expired or has already been used.", 
              variant: "destructive" 
            });
            // Remove token from URL
            setLocation("/investor");
          }
        })
        .catch(() => {
          toast({ title: "Error", description: "Could not verify access link.", variant: "destructive" });
          setLocation("/investor");
        })
        .finally(() => {
          setMagicLinkVerifying(false);
        });
    }
  }, [isAuthenticated, magicLinkVerifying, auth, toast, setLocation]);
  
  const [selectedYear, setSelectedYear] = useState("2025"); // Default to 2025 for historical data
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<InternalRoom | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<InternalRoom | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({ unitNumber: "", unitDescription: "", condition: "good", isOffline: false, offlineReason: "", notes: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "normal", assignedTo: "", dueDate: "" });

  // Helper to get auth headers - use admin key if available, else investor session
  const getAuthHeaders = () => auth.getAuthHeaders();

  // Create a stable auth key for query caching
  const authCacheKey = auth.isAdmin ? "admin" : auth.investorSession || "";

  const dashboardQuery = useQuery({
    queryKey: ["/api/investor/dashboard", authCacheKey],
    queryFn: async () => {
      const res = await fetch("/api/investor/dashboard", {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000
  });

  const revenueQuery = useQuery({
    queryKey: ["/api/investor/revenue", authCacheKey, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/investor/revenue?year=${selectedYear}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch revenue data");
      return res.json();
    },
    enabled: isAuthenticated
  });

  const analyticsQuery = useQuery({
    queryKey: ["/api/investor/analytics", authCacheKey],
    queryFn: async () => {
      const res = await fetch("/api/investor/analytics", {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: isAuthenticated
  });

  const housekeepingQuery = useQuery({
    queryKey: ["/api/investor/housekeeping", authCacheKey],
    queryFn: async () => {
      const res = await fetch("/api/investor/housekeeping", {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch housekeeping");
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000
  });

  const roomsQuery = useQuery({
    queryKey: ["/api/rooms", authCacheKey],
    queryFn: async () => {
      const res = await fetch("/api/rooms", {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch rooms");
      return res.json();
    },
    enabled: isAuthenticated
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: typeof newRoom) => {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create room");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setRoomDialogOpen(false);
      setNewRoom({ unitNumber: "", unitDescription: "", condition: "good", isOffline: false, offlineReason: "", notes: "" });
      toast({ title: "Room Created", description: "The room has been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create room.", variant: "destructive" });
    }
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InternalRoom> }) => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update room");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setEditingRoom(null);
      toast({ title: "Room Updated", description: "Changes have been saved." });
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to delete room");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: "Room Deleted", description: "The room has been removed." });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: typeof newTask & { roomId: string }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setTaskDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "normal", assignedTo: "", dueDate: "" });
      toast({ title: "Task Created", description: "The task has been added." });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RoomTask> }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    }
  });

  // Step 1: Check if phone is in whitelist and send verification code
  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      toast({ title: "Error", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      // First check if phone is in the investor whitelist
      const checkRes = await fetch("/api/investor/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber })
      });
      const checkData = await checkRes.json();
      
      if (!checkData.success) {
        toast({ title: "Access Denied", description: checkData.error, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      setInvestorName(checkData.investor.name);
      
      // Send verification code
      const sendRes = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber })
      });
      const sendData = await sendRes.json();
      
      if (sendData.success) {
        toast({ title: "Code Sent", description: "Please check your phone for the verification code." });
        setLoginStep("code");
      } else {
        toast({ title: "Error", description: sendData.error || "Failed to send verification code.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not send verification code.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  // Step 2: Verify OTP code and get session token
  const handleVerifyCode = async () => {
    if (!otpCode.trim()) {
      toast({ title: "Error", description: "Please enter the verification code.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/investor/verify-and-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber, code: otpCode })
      });
      const data = await res.json();
      
      if (data.success) {
        // Store the session token via shared auth context
        auth.loginAsInvestor(data.sessionToken, data.investor.name);
        setInvestorName(data.investor.name);
        toast({ title: "Welcome", description: `Welcome to the Investor Portal, ${data.investor.name}!` });
      } else {
        toast({ title: "Invalid Code", description: data.error || "The verification code is incorrect.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not verify code.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    // Call shared auth context logout (handles server-side session invalidation)
    await auth.logout();
    setPhoneNumber("");
    setOtpCode("");
    setLoginStep("phone");
    setInvestorName("");
  };

  const dashboard: DashboardMetrics = dashboardQuery.data?.data || {};
  const revenueData: MonthlyRevenue[] = revenueQuery.data?.data?.monthly || [];
  const ytdMetrics = revenueQuery.data?.data?.ytd || {};
  const roomTypeRevenue: RevenueByRoomType[] = analyticsQuery.data?.data?.revenueByRoomType || [];
  const bookingTrends = analyticsQuery.data?.data?.bookingTrends || [];
  const housekeeping: HousekeepingSummary = housekeepingQuery.data?.data?.summary || {};
  const rooms: InternalRoom[] = roomsQuery.data?.data || [];

  // Keep selectedRoom synced with latest data from roomsQuery
  useEffect(() => {
    if (selectedRoomId && rooms.length > 0) {
      const updatedRoom = rooms.find(r => r.id === selectedRoomId);
      if (updatedRoom) {
        setSelectedRoom(updatedRoom);
      } else {
        // Room was deleted
        setSelectedRoom(null);
        setSelectedRoomId(null);
      }
    }
  }, [rooms, selectedRoomId]);

  // Handle room selection
  const handleSelectRoom = (room: InternalRoom) => {
    setSelectedRoomId(room.id);
    setSelectedRoom(room);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4 pt-24 bg-gradient-to-br from-slate-900 to-slate-800">
          <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-white">Investor Portal</CardTitle>
              <CardDescription className="text-slate-400">
                Access financial reports, analytics, and key performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {magicLinkVerifying ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-blue-400 mx-auto mb-4 animate-spin" />
                  <p className="text-slate-300">Verifying your access link...</p>
                </div>
              ) : loginStep === "phone" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="investor-phone" className="text-slate-300">Phone Number</Label>
                    <Input
                      id="investor-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                      data-testid="input-investor-phone"
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" 
                    onClick={handleSendCode}
                    disabled={isLoading}
                    data-testid="button-investor-send-code"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {isLoading ? "Verifying..." : "Send Verification Code"}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    Access is restricted to authorized investors only
                  </p>
                </>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <p className="text-slate-300">Welcome, {investorName}</p>
                    <p className="text-sm text-slate-500">Enter the code sent to {phoneNumber}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="investor-code" className="text-slate-300">Verification Code</Label>
                    <Input
                      id="investor-code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-center text-lg tracking-widest"
                      data-testid="input-investor-code"
                      disabled={isLoading}
                      maxLength={6}
                    />
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" 
                    onClick={handleVerifyCode}
                    disabled={isLoading}
                    data-testid="button-investor-verify-code"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {isLoading ? "Verifying..." : "Access Portal"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-slate-400 hover:text-white"
                    onClick={() => {
                      setLoginStep("phone");
                      setOtpCode("");
                    }}
                    disabled={isLoading}
                  >
                    Use a different phone number
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">Investor Portal</h1>
              <p className="text-muted-foreground">Financial analytics and performance metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                dashboardQuery.refetch();
                revenueQuery.refetch();
                analyticsQuery.refetch();
                housekeepingQuery.refetch();
                roomsQuery.refetch();
              }} data-testid="button-refresh-all">
                <RefreshCw className={`w-4 h-4 mr-2 ${dashboardQuery.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-investor-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="revenue" data-testid="tab-revenue">
                <DollarSign className="w-4 h-4 mr-2" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <PieChartIcon className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="rooms" data-testid="tab-rooms">
                <Home className="w-4 h-4 mr-2" />
                Room Manager
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                        <p className="text-3xl font-bold" data-testid="text-occupancy-rate">
                          {formatPercent(dashboard.occupancyRate || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Percent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-green-600">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      <span>vs last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">In-House Guests</p>
                        <p className="text-3xl font-bold" data-testid="text-inhouse-guests">
                          {dashboard.inHouse || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                        <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {dashboard.arrivals || 0} arriving today
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Available Rooms</p>
                        <p className="text-3xl font-bold" data-testid="text-available-rooms">
                          {dashboard.available || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <BedDouble className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      of {dashboard.totalRooms || 0} total rooms
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">YTD Revenue</p>
                        <p className="text-3xl font-bold" data-testid="text-ytd-revenue">
                          {formatCurrency(ytdMetrics.totalRevenue || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                        <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-green-600">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      <span>{formatPercent(ytdMetrics.growthPercent || 0)} YoY</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Activity</CardTitle>
                    <CardDescription>Current arrivals, departures, and occupancy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CalendarCheck className="w-5 h-5 text-green-600" />
                          <span className="font-medium">Arrivals</span>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {dashboard.arrivals || 0} guests
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CalendarX className="w-5 h-5 text-red-600" />
                          <span className="font-medium">Departures</span>
                        </div>
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                          {dashboard.departures || 0} guests
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">Stayovers</span>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {dashboard.stayovers || 0} guests
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Guest Services</CardTitle>
                    <CardDescription>Housekeeping status and room conditions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          <span className="font-medium">Vacant Dirty</span>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                          {housekeeping.vacantDirty || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium">Vacant Clean</span>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {housekeeping.vacantClean || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">Occupied</span>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {housekeeping.occupied || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Wrench className="w-5 h-5 text-red-600" />
                          <span className="font-medium">Out of Service</span>
                        </div>
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                          {housekeeping.outOfService || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-slate-600" />
                          <span className="font-medium">Offline (Not Renovated)</span>
                        </div>
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                          {housekeeping.offline || 0}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Performance Indicators</CardTitle>
                    <CardDescription>Year-to-date performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ADR (Avg Daily Rate)</span>
                        <span className="font-semibold">{formatCurrency(ytdMetrics.adr || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">RevPAR</span>
                        <span className="font-semibold">{formatCurrency(ytdMetrics.revpar || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Avg Length of Stay</span>
                        <span className="font-semibold">{(ytdMetrics.avgLos || 0).toFixed(1)} nights</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Room Nights</span>
                        <span className="font-semibold">{ytdMetrics.totalRoomNights || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Bookings</span>
                        <span className="font-semibold">{ytdMetrics.totalBookings || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold">Monthly Revenue Report</h2>
                  <p className="text-sm text-muted-foreground">Track revenue, ADR, and RevPAR trends</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32" data-testid="select-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" data-testid="button-export-revenue">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} className="text-xs" />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelClassName="font-semibold"
                        />
                        <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      {revenueQuery.isLoading ? "Loading revenue data..." : "No revenue data available"}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>ADR Trend</CardTitle>
                    <CardDescription>Average Daily Rate by month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {revenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis tickFormatter={(v) => `$${v}`} className="text-xs" />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Line type="monotone" dataKey="adr" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Occupancy Rate</CardTitle>
                    <CardDescription>Monthly occupancy percentage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {revenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} className="text-xs" />
                          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          <Line type="monotone" dataKey="occupancy" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Room Nights</TableHead>
                        <TableHead className="text-right">ADR</TableHead>
                        <TableHead className="text-right">RevPAR</TableHead>
                        <TableHead className="text-right">Occupancy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueData.length > 0 ? revenueData.map((row, i) => (
                        <TableRow key={i} data-testid={`row-revenue-${i}`}>
                          <TableCell className="font-medium">{row.month}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-right">{row.roomNights}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.adr)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.revpar)}</TableCell>
                          <TableCell className="text-right">{formatPercent(row.occupancy)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No revenue data available for {selectedYear}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Business Analytics</h2>
                <p className="text-sm text-muted-foreground">Deep insights into booking patterns and revenue distribution</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Room Type</CardTitle>
                    <CardDescription>Distribution of revenue across room categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {roomTypeRevenue.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={roomTypeRevenue}
                            dataKey="revenue"
                            nameKey="roomType"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ roomType, percentage }) => `${roomType}: ${percentage.toFixed(0)}%`}
                          >
                            {roomTypeRevenue.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        {analyticsQuery.isLoading ? "Loading analytics..." : "No data available"}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Booking Trends</CardTitle>
                    <CardDescription>Weekly booking patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookingTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={bookingTrends}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="day" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip />
                          <Bar dataKey="bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No booking trend data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Room Type Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Room Type</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                        <TableHead className="text-right">Avg. Revenue/Booking</TableHead>
                        <TableHead className="text-right">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roomTypeRevenue.length > 0 ? roomTypeRevenue.map((row, i) => (
                        <TableRow key={i} data-testid={`row-roomtype-${i}`}>
                          <TableCell className="font-medium">{row.roomType}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-right">{row.bookings}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.bookings > 0 ? row.revenue / row.bookings : 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{formatPercent(row.percentage)}</Badge>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No room type data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rooms" className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold">Room Manager</h2>
                  <p className="text-sm text-muted-foreground">Internal room tracking and maintenance tasks</p>
                </div>
                <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-room">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Room</DialogTitle>
                      <DialogDescription>Track an internal room outside of Cloudbeds</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Unit Number</Label>
                        <Input 
                          placeholder="e.g., 101, A-12"
                          value={newRoom.unitNumber}
                          onChange={(e) => setNewRoom({...newRoom, unitNumber: e.target.value})}
                          data-testid="input-unit-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input 
                          placeholder="e.g., King Suite, First Floor"
                          value={newRoom.unitDescription}
                          onChange={(e) => setNewRoom({...newRoom, unitDescription: e.target.value})}
                          data-testid="input-unit-description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <Select value={newRoom.condition} onValueChange={(v) => setNewRoom({...newRoom, condition: v})}>
                          <SelectTrigger data-testid="select-condition">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="is-offline"
                          checked={newRoom.isOffline}
                          onChange={(e) => setNewRoom({...newRoom, isOffline: e.target.checked})}
                          className="rounded"
                        />
                        <Label htmlFor="is-offline">Offline (not in Cloudbeds)</Label>
                      </div>
                      {newRoom.isOffline && (
                        <div className="space-y-2">
                          <Label>Offline Reason</Label>
                          <Input 
                            placeholder="e.g., Not renovated, under construction"
                            value={newRoom.offlineReason}
                            onChange={(e) => setNewRoom({...newRoom, offlineReason: e.target.value})}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea 
                          placeholder="Additional notes about this room..."
                          value={newRoom.notes}
                          onChange={(e) => setNewRoom({...newRoom, notes: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
                      <Button 
                        onClick={() => createRoomMutation.mutate(newRoom)}
                        disabled={!newRoom.unitNumber || createRoomMutation.isPending}
                        data-testid="button-save-room"
                      >
                        {createRoomMutation.isPending ? "Saving..." : "Save Room"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Rooms ({rooms.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Unit</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Condition</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rooms.length > 0 ? rooms.map((room) => (
                            <TableRow 
                              key={room.id} 
                              className={`cursor-pointer ${selectedRoom?.id === room.id ? "bg-muted" : ""}`}
                              onClick={() => handleSelectRoom(room)}
                              data-testid={`row-room-${room.id}`}
                            >
                              <TableCell className="font-medium">{room.unitNumber}</TableCell>
                              <TableCell>{room.unitDescription || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  room.condition === "good" ? "default" : 
                                  room.condition === "fair" ? "secondary" : "destructive"
                                }>
                                  {room.condition}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {room.isOffline ? (
                                  <Badge variant="outline" className="text-slate-500">Offline</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600">Active</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); setEditingRoom(room); }}
                                  data-testid={`button-edit-room-${room.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (confirm("Delete this room and all its tasks?")) {
                                      deleteRoomMutation.mutate(room.id);
                                    }
                                  }}
                                  data-testid={`button-delete-room-${room.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                No rooms added yet. Click "Add Room" to get started.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">
                          {selectedRoom ? `Room ${selectedRoom.unitNumber}` : "Select a Room"}
                        </CardTitle>
                        <CardDescription>
                          {selectedRoom ? "Tasks and details" : "Click a room to view details"}
                        </CardDescription>
                      </div>
                      {selectedRoom && (
                        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" data-testid="button-add-task">
                              <Plus className="w-4 h-4 mr-1" />
                              Task
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Task for {selectedRoom.unitNumber}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Task Title</Label>
                                <Input 
                                  placeholder="e.g., Paint Interior, Replace Mattress"
                                  value={newTask.title}
                                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                                  data-testid="input-task-title"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea 
                                  placeholder="Task details..."
                                  value={newTask.description}
                                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Priority</Label>
                                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: v})}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                      <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Assigned To</Label>
                                  <Input 
                                    placeholder="Worker name"
                                    value={newTask.assignedTo}
                                    onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                                  />
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
                              <Button 
                                onClick={() => createTaskMutation.mutate({ ...newTask, roomId: selectedRoom.id })}
                                disabled={!newTask.title || createTaskMutation.isPending}
                                data-testid="button-save-task"
                              >
                                {createTaskMutation.isPending ? "Adding..." : "Add Task"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardHeader>
                    <CardContent>
                      {selectedRoom ? (
                        <div className="space-y-4">
                          {selectedRoom.isOffline && selectedRoom.offlineReason && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-sm">
                              <span className="font-medium">Offline Reason: </span>
                              {selectedRoom.offlineReason}
                            </div>
                          )}
                          {selectedRoom.notes && (
                            <div className="text-sm text-muted-foreground">
                              {selectedRoom.notes}
                            </div>
                          )}
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2">
                              <ClipboardList className="w-4 h-4" />
                              Tasks ({selectedRoom.tasks?.length || 0})
                            </h4>
                            {selectedRoom.tasks && selectedRoom.tasks.length > 0 ? (
                              <div className="space-y-2">
                                {selectedRoom.tasks.map((task) => (
                                  <div 
                                    key={task.id}
                                    className="p-3 border rounded-lg flex items-start justify-between gap-2"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        {task.status === "completed" ? (
                                          <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : task.status === "in_progress" ? (
                                          <Clock className="w-4 h-4 text-blue-500" />
                                        ) : (
                                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                        )}
                                        <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                                          {task.title}
                                        </span>
                                      </div>
                                      {task.assignedTo && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Assigned to: {task.assignedTo}
                                        </p>
                                      )}
                                    </div>
                                    <Badge 
                                      variant={
                                        task.priority === "urgent" ? "destructive" :
                                        task.priority === "high" ? "default" : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {task.priority}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No tasks for this room.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <Home className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Select a room from the list to view details and tasks</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Edit Room Dialog */}
      <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room {editingRoom?.unitNumber}</DialogTitle>
          </DialogHeader>
          {editingRoom && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Unit Number</Label>
                <Input 
                  value={editingRoom.unitNumber}
                  onChange={(e) => setEditingRoom({...editingRoom, unitNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  value={editingRoom.unitDescription || ""}
                  onChange={(e) => setEditingRoom({...editingRoom, unitDescription: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={editingRoom.condition} onValueChange={(v) => setEditingRoom({...editingRoom, condition: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="edit-is-offline"
                  checked={editingRoom.isOffline}
                  onChange={(e) => setEditingRoom({...editingRoom, isOffline: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="edit-is-offline">Offline (not in Cloudbeds)</Label>
              </div>
              {editingRoom.isOffline && (
                <div className="space-y-2">
                  <Label>Offline Reason</Label>
                  <Input 
                    value={editingRoom.offlineReason || ""}
                    onChange={(e) => setEditingRoom({...editingRoom, offlineReason: e.target.value})}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={editingRoom.notes || ""}
                  onChange={(e) => setEditingRoom({...editingRoom, notes: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoom(null)}>Cancel</Button>
            <Button 
              onClick={() => editingRoom && updateRoomMutation.mutate({ id: editingRoom.id, data: editingRoom })}
              disabled={updateRoomMutation.isPending}
            >
              {updateRoomMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
