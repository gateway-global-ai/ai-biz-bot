import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Shield, 
  Users, 
  CalendarCheck, 
  CalendarX, 
  Home, 
  DollarSign, 
  Settings, 
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  LogOut,
  BarChart3,
  Briefcase,
  TrendingUp,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Eye,
  Search,
  X,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardData {
  arrivals?: number | string | { count: number; reservations?: any[] };
  departures?: number | string | { count: number; reservations?: any[] };
  inHouse?: number | string | { count: number; reservations?: any[] };
  stayovers?: number | string;
  available?: number | string | { count: number };
  roomsOccupied?: number;
  percentageOccupied?: number;
  guestsInHouse?: number;
  roomsBlocked?: number;
  percentageBlocked?: number;
  capacity?: number;
}

interface RateOverride {
  id: number;
  reservationId: string;
  guestId?: string;
  guestName?: string;
  baseNightlyRate: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BusinessRule {
  id: number;
  code: string;
  label: string;
  payload: any;
  isActive: boolean;
}

interface InvestorUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  mailingAddress?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role?: string;
  department?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvestorInvestment {
  id: string;
  investorUserId: string;
  investmentDate: string;
  amount: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvestorLoan {
  id: string;
  investorUserId: string;
  loanDate: string;
  loanAmount: string;
  interestRate: string;
  monthlyPayment: string;
  maturityDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Reservation {
  reservationID: string;
  identifier: string;
  status: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  roomTypeName: string;
  roomName: string;
  total: string;
  balance: string;
  adults: number;
  children: number;
  hasRateOverride: boolean;
  createdAt: string;
}

interface ReservationDetail {
  reservationID: string;
  identifier: string;
  status: string;
  source: string;
  guestID: string;
  guestName: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  guestAddress: string;
  guestCity: string;
  guestState: string;
  guestZip: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  rooms: any[];
  roomTypeName: string;
  roomName: string;
  grandTotal: string;
  balance: string;
  paid: string;
  roomTotal: string;
  taxTotal: string;
  feeTotal: string;
  items: { description: string; quantity: number; amount: string; type: string }[];
  payments: { date: string; amount: string; method: string; notes: string }[];
  rateOverride: { id: string; baseNightlyRate: string; notes: string; isActive: boolean } | null;
  createdAt: string;
  modifiedAt: string;
  notes: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const auth = useAuth();
  const [inputKey, setInputKey] = useState("");
  
  // Use shared auth context
  const isAuthenticated = auth.isAdmin;
  const adminKey = auth.adminKey || "";
  
  // Rate override form state
  const [rateOverrideDialog, setRateOverrideDialog] = useState(false);
  const [editingOverride, setEditingOverride] = useState<RateOverride | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    reservationId: "",
    guestName: "",
    baseNightlyRate: "",
    notes: ""
  });

  // Investor user form state
  const [investorUserDialog, setInvestorUserDialog] = useState(false);
  const [editingInvestorUser, setEditingInvestorUser] = useState<InvestorUser | null>(null);
  const [investorUserForm, setInvestorUserForm] = useState({
    name: "",
    phone: "",
    email: "",
    mailingAddress: "",
    notes: ""
  });

  // Employee user form state
  const [employeeUserDialog, setEmployeeUserDialog] = useState(false);
  const [editingEmployeeUser, setEditingEmployeeUser] = useState<EmployeeUser | null>(null);
  const [employeeUserForm, setEmployeeUserForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "staff",
    department: "",
    notes: ""
  });

  // Investment form state
  const [investmentDialog, setInvestmentDialog] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestorInvestment | null>(null);
  const [selectedInvestorForInvestment, setSelectedInvestorForInvestment] = useState<string | null>(null);
  const [investmentForm, setInvestmentForm] = useState({
    investmentDate: "",
    amount: "",
    notes: ""
  });

  // Loan form state
  const [loanDialog, setLoanDialog] = useState(false);
  const [editingLoan, setEditingLoan] = useState<InvestorLoan | null>(null);
  const [selectedInvestorForLoan, setSelectedInvestorForLoan] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({
    loanDate: "",
    loanAmount: "",
    interestRate: "",
    monthlyPayment: "",
    maturityDate: "",
    notes: ""
  });

  // User sub-tab and expanded investor state
  const [userSubTab, setUserSubTab] = useState<"employees" | "investors">("investors");
  const [expandedInvestorId, setExpandedInvestorId] = useState<string | null>(null);

  // Reservation state
  const [reservationSearch, setReservationSearch] = useState("");
  const [reservationStatus, setReservationStatus] = useState("confirmed,checked_in,checked_out");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [reservationDetailDialog, setReservationDetailDialog] = useState(false);
  const [rateOverrideFormVisible, setRateOverrideFormVisible] = useState(false);
  const [newRateOverride, setNewRateOverride] = useState({ rate: "", notes: "" });

  // Dashboard query
  const dashboardQuery = useQuery({
    queryKey: ["/api/admin/dashboard", adminKey],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard", {
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000 // Refresh every minute
  });

  // Rate overrides query
  const rateOverridesQuery = useQuery({
    queryKey: ["/api/admin/rate-overrides", adminKey],
    queryFn: async () => {
      const res = await fetch("/api/admin/rate-overrides", {
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to fetch rate overrides");
      return res.json();
    },
    enabled: isAuthenticated
  });

  // Business rules query
  const businessRulesQuery = useQuery({
    queryKey: ["/api/admin/business-rules", adminKey],
    queryFn: async () => {
      const res = await fetch("/api/admin/business-rules", {
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to fetch business rules");
      return res.json();
    },
    enabled: isAuthenticated
  });

  // Investor users query
  const investorUsersQuery = useQuery({
    queryKey: ["/api/admin/investor-users", adminKey],
    queryFn: async () => {
      const res = await fetch("/api/admin/investor-users", {
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to fetch investor users");
      return res.json();
    },
    enabled: isAuthenticated
  });

  // Employee users query
  const employeeUsersQuery = useQuery({
    queryKey: ["/api/admin/employee-users", adminKey],
    queryFn: async () => {
      const res = await fetch("/api/admin/employee-users", {
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to fetch employee users");
      return res.json();
    },
    enabled: isAuthenticated
  });

  // Investments query for expanded investor
  const investmentsQuery = useQuery({
    queryKey: ["/api/admin/investor-users", expandedInvestorId, "investments", adminKey],
    queryFn: async () => {
      const res = await fetch(`/api/admin/investor-users/${expandedInvestorId}/investments`, {
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to fetch investments");
      return res.json();
    },
    enabled: isAuthenticated && !!expandedInvestorId
  });

  // Loans query for expanded investor
  const loansQuery = useQuery({
    queryKey: ["/api/admin/investor-users", expandedInvestorId, "loans", adminKey],
    queryFn: async () => {
      const res = await fetch(`/api/admin/investor-users/${expandedInvestorId}/loans`, {
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to fetch loans");
      return res.json();
    },
    enabled: isAuthenticated && !!expandedInvestorId
  });

  // Reservations list query
  const reservationsQuery = useQuery({
    queryKey: ["/api/admin/reservations", adminKey, reservationSearch, reservationStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: reservationStatus,
        ...(reservationSearch && { search: reservationSearch })
      });
      const res = await fetch(`/api/admin/reservations?${params}`, {
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to fetch reservations");
      return res.json();
    },
    enabled: isAuthenticated
  });

  // Reservation detail query
  const reservationDetailQuery = useQuery({
    queryKey: ["/api/admin/reservations", selectedReservationId, adminKey],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reservations/${selectedReservationId}`, {
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to fetch reservation details");
      return res.json();
    },
    enabled: isAuthenticated && !!selectedReservationId
  });

  // Save rate override from reservation detail
  const saveReservationRateOverrideMutation = useMutation({
    mutationFn: async ({ reservationId, rate, notes }: { reservationId: string; rate: string; notes: string }) => {
      const res = await fetch(`/api/admin/reservations/${reservationId}/rate-override`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey 
        },
        body: JSON.stringify({ baseNightlyRate: rate, notes })
      });
      if (!res.ok) throw new Error("Failed to save rate override");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Rate override saved successfully." });
      setRateOverrideFormVisible(false);
      setNewRateOverride({ rate: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations", selectedReservationId, adminKey] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/admin/reservations" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save rate override.", variant: "destructive" });
    }
  });

  // Delete rate override from reservation detail
  const deleteReservationRateOverrideMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const res = await fetch(`/api/admin/reservations/${reservationId}/rate-override`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to delete rate override");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Rate override removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations", selectedReservationId, adminKey] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/admin/reservations" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete rate override.", variant: "destructive" });
    }
  });

  // Create/update rate override mutation
  const saveOverrideMutation = useMutation({
    mutationFn: async (data: typeof overrideForm) => {
      const res = await fetch("/api/admin/rate-overrides", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey 
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to save rate override");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Rate override saved successfully." });
      setRateOverrideDialog(false);
      setEditingOverride(null);
      setOverrideForm({ reservationId: "", guestName: "", baseNightlyRate: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rate-overrides", adminKey] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save rate override.", variant: "destructive" });
    }
  });

  // Delete rate override mutation
  const deleteOverrideMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const res = await fetch(`/api/admin/rate-overrides/${reservationId}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to delete rate override");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Rate override removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rate-overrides", adminKey] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete rate override.", variant: "destructive" });
    }
  });

  // Update business rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ code, isActive }: { code: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/business-rules/${code}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey 
        },
        body: JSON.stringify({ isActive })
      });
      if (!res.ok) throw new Error("Failed to update business rule");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Business rule updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-rules", adminKey] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update business rule.", variant: "destructive" });
    }
  });

  // Create investor user mutation
  const createInvestorUserMutation = useMutation({
    mutationFn: async (data: typeof investorUserForm) => {
      const res = await fetch("/api/admin/investor-users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey 
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create investor user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Created", description: "Investor user added to whitelist." });
      setInvestorUserDialog(false);
      setEditingInvestorUser(null);
      setInvestorUserForm({ name: "", phone: "", email: "", mailingAddress: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-users", adminKey] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create investor user.", variant: "destructive" });
    }
  });

  // Update investor user mutation
  const updateInvestorUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof investorUserForm }) => {
      const res = await fetch(`/api/admin/investor-users/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey 
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update investor user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Investor user updated." });
      setInvestorUserDialog(false);
      setEditingInvestorUser(null);
      setInvestorUserForm({ name: "", phone: "", email: "", mailingAddress: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-users", adminKey] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update investor user.", variant: "destructive" });
    }
  });

  // Delete investor user mutation
  const deleteInvestorUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/investor-users/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to delete investor user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Investor user removed from whitelist." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-users", adminKey] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete investor user.", variant: "destructive" });
    }
  });

  // Employee mutations
  const createEmployeeUserMutation = useMutation({
    mutationFn: async (data: typeof employeeUserForm) => {
      const res = await fetch("/api/admin/employee-users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create employee user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Employee user created." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-users", adminKey] });
      setEmployeeUserDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create employee user.", variant: "destructive" });
    }
  });

  const updateEmployeeUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof employeeUserForm }) => {
      const res = await fetch(`/api/admin/employee-users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update employee user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Employee user updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-users", adminKey] });
      setEmployeeUserDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update employee user.", variant: "destructive" });
    }
  });

  const deleteEmployeeUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/employee-users/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to delete employee user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Employee user removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employee-users", adminKey] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete employee user.", variant: "destructive" });
    }
  });

  // Investment mutations
  const createInvestmentMutation = useMutation({
    mutationFn: async ({ investorId, data }: { investorId: string; data: typeof investmentForm }) => {
      const res = await fetch(`/api/admin/investor-users/${investorId}/investments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create investment");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Investment recorded." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-users", expandedInvestorId, "investments", adminKey] });
      setInvestmentDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create investment.", variant: "destructive" });
    }
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/investments/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to delete investment");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Investment removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-users", expandedInvestorId, "investments", adminKey] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete investment.", variant: "destructive" });
    }
  });

  // Loan mutations
  const createLoanMutation = useMutation({
    mutationFn: async ({ investorId, data }: { investorId: string; data: typeof loanForm }) => {
      const res = await fetch(`/api/admin/investor-users/${investorId}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create loan");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Loan recorded." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-users", expandedInvestorId, "loans", adminKey] });
      setLoanDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create loan.", variant: "destructive" });
    }
  });

  const deleteLoanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/loans/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey }
      });
      if (!res.ok) throw new Error("Failed to delete loan");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Loan removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-users", expandedInvestorId, "loans", adminKey] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete loan.", variant: "destructive" });
    }
  });

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: { "X-Admin-Key": inputKey }
      });
      if (res.ok) {
        auth.loginAsAdmin(inputKey);
        toast({ title: "Logged In", description: "Welcome to the admin dashboard." });
      } else {
        toast({ title: "Invalid Key", description: "The admin key is incorrect.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not authenticate.", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    auth.logout();
    setInputKey("");
  };

  const openEditOverride = (override: RateOverride) => {
    setEditingOverride(override);
    setOverrideForm({
      reservationId: override.reservationId,
      guestName: override.guestName || "",
      baseNightlyRate: override.baseNightlyRate,
      notes: override.notes || ""
    });
    setRateOverrideDialog(true);
  };

  const dashboard: DashboardData = dashboardQuery.data?.data || {};
  const rateOverrides: RateOverride[] = rateOverridesQuery.data?.data || [];
  const businessRules: BusinessRule[] = businessRulesQuery.data?.data || [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4 pt-24">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Admin Dashboard</CardTitle>
              <CardDescription>Enter your admin API key to access the dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-key">Admin API Key</Label>
                <Input
                  id="admin-key"
                  type="password"
                  placeholder="Enter your admin key"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  data-testid="input-admin-key"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleLogin}
                data-testid="button-admin-login"
              >
                <Shield className="w-4 h-4 mr-2" />
                Access Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage reservations, rates, and business rules</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/investor">
                <Button variant="outline" data-testid="button-investor-portal">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Revenue & Analytics
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout} data-testid="button-admin-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 max-w-2xl">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="reservations" data-testid="tab-reservations">
                <CalendarCheck className="w-4 h-4 mr-2" />
                Reservations
              </TabsTrigger>
              <TabsTrigger value="rates" data-testid="tab-rates">
                <DollarSign className="w-4 h-4 mr-2" />
                Rates
              </TabsTrigger>
              <TabsTrigger value="rules" data-testid="tab-rules">
                <Settings className="w-4 h-4 mr-2" />
                Rules
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-xl font-semibold">Today's Overview</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => dashboardQuery.refetch()}
                  disabled={dashboardQuery.isFetching}
                  data-testid="button-refresh-dashboard"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${dashboardQuery.isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {dashboardQuery.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-16 bg-muted rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                          <CalendarCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Arrivals</p>
                          <p className="text-2xl font-bold" data-testid="text-arrivals-count">
                            {typeof dashboard.arrivals === 'object' ? dashboard.arrivals?.count : dashboard.arrivals || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                          <CalendarX className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Departures</p>
                          <p className="text-2xl font-bold" data-testid="text-departures-count">
                            {typeof dashboard.departures === 'object' ? dashboard.departures?.count : dashboard.departures || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">In-House</p>
                          <p className="text-2xl font-bold" data-testid="text-inhouse-count">
                            {typeof dashboard.inHouse === 'object' ? dashboard.inHouse?.count : dashboard.inHouse || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                          <Home className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Stayovers</p>
                          <p className="text-2xl font-bold" data-testid="text-stayovers-count">
                            {dashboard.stayovers || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Additional Stats */}
              {!dashboardQuery.isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Occupancy</p>
                          <p className="text-2xl font-bold" data-testid="text-occupancy">
                            {dashboard.percentageOccupied ? `${Number(dashboard.percentageOccupied).toFixed(1)}%` : '0%'}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {dashboard.roomsOccupied || 0} / {dashboard.capacity || 46} rooms
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Guests In-House</p>
                          <p className="text-2xl font-bold" data-testid="text-guests-inhouse">
                            {dashboard.guestsInHouse || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Rooms Blocked</p>
                          <p className="text-2xl font-bold" data-testid="text-rooms-blocked">
                            {dashboard.roomsBlocked || 0}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {dashboard.percentageBlocked ? `${Number(dashboard.percentageBlocked).toFixed(1)}%` : '0%'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Arrivals List - only shown when arrivals is an object with reservations */}
              {typeof dashboard.arrivals === 'object' && dashboard.arrivals?.reservations && dashboard.arrivals.reservations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Expected Arrivals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Guest</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Check-In</TableHead>
                          <TableHead>Nights</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dashboard.arrivals as { reservations: any[] }).reservations.slice(0, 10).map((r: any, i: number) => (
                          <TableRow key={i} data-testid={`row-arrival-${i}`}>
                            <TableCell className="font-medium">{r.guestName || "Guest"}</TableCell>
                            <TableCell>{r.roomTypeName || r.roomType || "—"}</TableCell>
                            <TableCell>{r.startDate || r.checkIn || "—"}</TableCell>
                            <TableCell>{r.nights || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{r.status || "confirmed"}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations" className="space-y-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold">Reservations</h2>
                  <p className="text-sm text-muted-foreground">View and manage all reservations from Cloudbeds</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => reservationsQuery.refetch()}
                  disabled={reservationsQuery.isFetching}
                  data-testid="button-refresh-reservations"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${reservationsQuery.isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Search and filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by guest name, email, or confirmation #"
                    value={reservationSearch}
                    onChange={(e) => setReservationSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-reservation-search"
                  />
                </div>
                <Select value={reservationStatus} onValueChange={setReservationStatus}>
                  <SelectTrigger className="w-[180px]" data-testid="select-reservation-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed,checked_in,checked_out">All Active</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                    <SelectItem value="confirmed,checked_in,checked_out,canceled,no_show">All Statuses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reservations Table */}
              <Card>
                <CardContent className="p-0">
                  {reservationsQuery.isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading reservations...</div>
                  ) : (reservationsQuery.data?.data || []).length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No reservations found for the selected filters.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Confirmation #</TableHead>
                          <TableHead>Guest</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reservationsQuery.data?.data || []).map((res: Reservation) => (
                          <TableRow key={res.reservationID} data-testid={`row-reservation-${res.reservationID}`}>
                            <TableCell className="font-mono font-medium">
                              {res.identifier || res.reservationID}
                              {res.hasRateOverride && (
                                <Badge variant="outline" className="ml-2 text-xs">Override</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>{res.guestName}</div>
                              <div className="text-xs text-muted-foreground">{res.guestEmail}</div>
                            </TableCell>
                            <TableCell>{new Date(res.checkInDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(res.checkOutDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="text-sm">{res.roomTypeName}</div>
                              <div className="text-xs text-muted-foreground">{res.roomName}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                res.status === 'checked_in' ? 'default' :
                                res.status === 'confirmed' ? 'secondary' :
                                res.status === 'checked_out' ? 'outline' :
                                'destructive'
                              }>
                                {res.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">${parseFloat(res.total || '0').toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedReservationId(res.reservationID);
                                  setReservationDetailDialog(true);
                                  setRateOverrideFormVisible(false);
                                }}
                                data-testid={`button-view-reservation-${res.reservationID}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Reservation Detail Dialog */}
              <Dialog open={reservationDetailDialog} onOpenChange={(open) => {
                setReservationDetailDialog(open);
                if (!open) {
                  setSelectedReservationId(null);
                  setRateOverrideFormVisible(false);
                }
              }}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  {reservationDetailQuery.isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading reservation details...</div>
                  ) : reservationDetailQuery.data?.data ? (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                          Reservation #{reservationDetailQuery.data.data.identifier || reservationDetailQuery.data.data.reservationID}
                          <Badge variant={
                            reservationDetailQuery.data.data.status === 'checked_in' ? 'default' :
                            reservationDetailQuery.data.data.status === 'confirmed' ? 'secondary' :
                            reservationDetailQuery.data.data.status === 'checked_out' ? 'outline' :
                            'destructive'
                          }>
                            {reservationDetailQuery.data.data.status.replace('_', ' ')}
                          </Badge>
                        </DialogTitle>
                        <DialogDescription>
                          Source: {reservationDetailQuery.data.data.source} | Created: {new Date(reservationDetailQuery.data.data.createdAt).toLocaleDateString()}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-6 mt-4">
                        {/* Guest Info */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">Guest Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="font-semibold">{reservationDetailQuery.data.data.guestName}</div>
                              {reservationDetailQuery.data.data.guestEmail && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  {reservationDetailQuery.data.data.guestEmail}
                                </div>
                              )}
                              {reservationDetailQuery.data.data.guestPhone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {reservationDetailQuery.data.data.guestPhone}
                                </div>
                              )}
                              {(reservationDetailQuery.data.data.guestAddress || reservationDetailQuery.data.data.guestCity) && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  {[
                                    reservationDetailQuery.data.data.guestAddress,
                                    reservationDetailQuery.data.data.guestCity,
                                    reservationDetailQuery.data.data.guestState,
                                    reservationDetailQuery.data.data.guestZip
                                  ].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">Stay Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Check-in:</span>
                                <span className="font-medium">{new Date(reservationDetailQuery.data.data.checkInDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Check-out:</span>
                                <span className="font-medium">{new Date(reservationDetailQuery.data.data.checkOutDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Nights:</span>
                                <span className="font-medium">{reservationDetailQuery.data.data.nights}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Guests:</span>
                                <span className="font-medium">
                                  {reservationDetailQuery.data.data.adults} adult{reservationDetailQuery.data.data.adults !== 1 ? 's' : ''}
                                  {reservationDetailQuery.data.data.children > 0 && `, ${reservationDetailQuery.data.data.children} child${reservationDetailQuery.data.data.children !== 1 ? 'ren' : ''}`}
                                </span>
                              </div>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Room:</span>
                                <span className="font-medium">{reservationDetailQuery.data.data.roomTypeName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Room #:</span>
                                <span className="font-medium">{reservationDetailQuery.data.data.roomName}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Financials */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Financial Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Room Charges</div>
                                <div className="text-lg font-semibold">${parseFloat(reservationDetailQuery.data.data.roomTotal || '0').toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Taxes</div>
                                <div className="text-lg font-semibold">${parseFloat(reservationDetailQuery.data.data.taxTotal || '0').toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Grand Total</div>
                                <div className="text-lg font-semibold text-primary">${parseFloat(reservationDetailQuery.data.data.grandTotal || '0').toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Balance Due</div>
                                <div className={`text-lg font-semibold ${parseFloat(reservationDetailQuery.data.data.balance || '0') > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                  ${parseFloat(reservationDetailQuery.data.data.balance || '0').toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Rate Override Section */}
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium">Rate Override</CardTitle>
                              {!reservationDetailQuery.data.data.rateOverride && !rateOverrideFormVisible && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRateOverrideFormVisible(true)}
                                  data-testid="button-add-rate-override"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Override
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            {reservationDetailQuery.data.data.rateOverride ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                                  <div>
                                    <div className="font-semibold">${parseFloat(reservationDetailQuery.data.data.rateOverride.baseNightlyRate).toFixed(2)}/night</div>
                                    {reservationDetailQuery.data.data.rateOverride.notes && (
                                      <div className="text-sm text-muted-foreground">{reservationDetailQuery.data.data.rateOverride.notes}</div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (selectedReservationId) {
                                        deleteReservationRateOverrideMutation.mutate(selectedReservationId);
                                      }
                                    }}
                                    disabled={deleteReservationRateOverrideMutation.isPending}
                                    data-testid="button-delete-rate-override"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ) : rateOverrideFormVisible ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Nightly Rate ($)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={newRateOverride.rate}
                                      onChange={(e) => setNewRateOverride({ ...newRateOverride, rate: e.target.value })}
                                      placeholder="75.00"
                                      data-testid="input-override-rate"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Input
                                      value={newRateOverride.notes}
                                      onChange={(e) => setNewRateOverride({ ...newRateOverride, notes: e.target.value })}
                                      placeholder="Negotiated rate"
                                      data-testid="input-override-notes"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (selectedReservationId) {
                                        saveReservationRateOverrideMutation.mutate({
                                          reservationId: selectedReservationId,
                                          rate: newRateOverride.rate,
                                          notes: newRateOverride.notes
                                        });
                                      }
                                    }}
                                    disabled={!newRateOverride.rate || saveReservationRateOverrideMutation.isPending}
                                    data-testid="button-save-rate-override"
                                  >
                                    {saveReservationRateOverrideMutation.isPending ? "Saving..." : "Save Override"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRateOverrideFormVisible(false);
                                      setNewRateOverride({ rate: "", notes: "" });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No rate override configured for this reservation.
                              </p>
                            )}
                          </CardContent>
                        </Card>

                        {/* Notes */}
                        {reservationDetailQuery.data.data.notes && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm">{reservationDetailQuery.data.data.notes}</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">Reservation not found.</div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Rate Overrides Tab */}
            <TabsContent value="rates" className="space-y-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold">Rate Overrides</h2>
                  <p className="text-sm text-muted-foreground">Set custom nightly rates for specific reservations</p>
                </div>
                <Dialog open={rateOverrideDialog} onOpenChange={setRateOverrideDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setEditingOverride(null);
                        setOverrideForm({ reservationId: "", guestName: "", baseNightlyRate: "", notes: "" });
                      }}
                      data-testid="button-add-override"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Override
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingOverride ? "Edit Rate Override" : "Add Rate Override"}</DialogTitle>
                      <DialogDescription>
                        Set a custom nightly rate for a specific reservation
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="reservationId">Reservation ID</Label>
                        <Input
                          id="reservationId"
                          placeholder="e.g., 12345678"
                          value={overrideForm.reservationId}
                          onChange={(e) => setOverrideForm({ ...overrideForm, reservationId: e.target.value })}
                          disabled={!!editingOverride}
                          data-testid="input-override-reservation-id"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guestName">Guest Name (optional)</Label>
                        <Input
                          id="guestName"
                          placeholder="Guest name for reference"
                          value={overrideForm.guestName}
                          onChange={(e) => setOverrideForm({ ...overrideForm, guestName: e.target.value })}
                          data-testid="input-override-guest-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="baseNightlyRate">Nightly Rate ($)</Label>
                        <Input
                          id="baseNightlyRate"
                          type="number"
                          placeholder="e.g., 59.00"
                          value={overrideForm.baseNightlyRate}
                          onChange={(e) => setOverrideForm({ ...overrideForm, baseNightlyRate: e.target.value })}
                          data-testid="input-override-rate"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Input
                          id="notes"
                          placeholder="e.g., Negotiated corporate rate"
                          value={overrideForm.notes}
                          onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                          data-testid="input-override-notes"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setRateOverrideDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => saveOverrideMutation.mutate(overrideForm)}
                        disabled={!overrideForm.reservationId || !overrideForm.baseNightlyRate || saveOverrideMutation.isPending}
                        data-testid="button-save-override"
                      >
                        {saveOverrideMutation.isPending ? "Saving..." : "Save Override"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  {rateOverridesQuery.isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                  ) : rateOverrides.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No rate overrides configured. Add one to set custom pricing for specific reservations.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reservation ID</TableHead>
                          <TableHead>Guest</TableHead>
                          <TableHead>Nightly Rate</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rateOverrides.map((override) => (
                          <TableRow key={override.id} data-testid={`row-override-${override.reservationId}`}>
                            <TableCell className="font-mono">{override.reservationId}</TableCell>
                            <TableCell>{override.guestName || "—"}</TableCell>
                            <TableCell className="font-semibold">${override.baseNightlyRate}/night</TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
                              {override.notes || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={override.isActive ? "default" : "secondary"}>
                                {override.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditOverride(override)}
                                  data-testid={`button-edit-override-${override.reservationId}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteOverrideMutation.mutate(override.reservationId)}
                                  disabled={deleteOverrideMutation.isPending}
                                  data-testid={`button-delete-override-${override.reservationId}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Rules Tab */}
            <TabsContent value="rules" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Business Rules</h2>
                <p className="text-sm text-muted-foreground">Configure discounts, taxes, and other pricing rules</p>
              </div>

              <div className="grid gap-4">
                {businessRulesQuery.isLoading ? (
                  <Card className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-16 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ) : businessRules.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No business rules configured.
                    </CardContent>
                  </Card>
                ) : (
                  businessRules.map((rule) => (
                    <Card key={rule.id} data-testid={`card-rule-${rule.code}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold">{rule.label}</h3>
                              <Badge variant="outline" className="font-mono text-xs">
                                {rule.code}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {rule.code === "NO_TAX_AFTER_30_DAYS" && "Guests staying 30+ days are exempt from lodging tax"}
                              {rule.code === "WEEKLY_DISCOUNT" && `${rule.payload?.percent || 10}% discount for weekly extensions`}
                              {rule.code === "MONTHLY_DISCOUNT" && `${rule.payload?.percent || 20}% discount for monthly extensions`}
                              {rule.code === "DEFAULT_TAX_RATE" && `${rule.payload?.percent || 12}% lodging tax for stays under 30 days`}
                            </p>
                            {rule.payload && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                {JSON.stringify(rule.payload)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Label htmlFor={`rule-${rule.code}`} className="text-sm">
                              {rule.isActive ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id={`rule-${rule.code}`}
                              checked={rule.isActive}
                              onCheckedChange={(checked) => updateRuleMutation.mutate({ code: rule.code, isActive: checked })}
                              disabled={updateRuleMutation.isPending}
                              data-testid={`switch-rule-${rule.code}`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Users Tab with Sub-tabs for Employees and Investors */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant={userSubTab === "employees" ? "default" : "outline"}
                  onClick={() => setUserSubTab("employees")}
                  data-testid="subtab-employees"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Employees
                </Button>
                <Button
                  variant={userSubTab === "investors" ? "default" : "outline"}
                  onClick={() => setUserSubTab("investors")}
                  data-testid="subtab-investors"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Investors
                </Button>
              </div>

              {/* Employees Section */}
              {userSubTab === "employees" && (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h2 className="text-xl font-semibold">Employee Users</h2>
                      <p className="text-sm text-muted-foreground">Manage staff members and their portal access</p>
                    </div>
                    <Dialog open={employeeUserDialog} onOpenChange={setEmployeeUserDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={() => {
                            setEditingEmployeeUser(null);
                            setEmployeeUserForm({ name: "", phone: "", email: "", role: "staff", department: "", notes: "" });
                          }}
                          data-testid="button-add-employee"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Employee
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingEmployeeUser ? "Edit Employee" : "Add Employee"}</DialogTitle>
                          <DialogDescription>
                            Manage employee portal access
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="employee-name">Name *</Label>
                            <Input
                              id="employee-name"
                              value={employeeUserForm.name}
                              onChange={(e) => setEmployeeUserForm({ ...employeeUserForm, name: e.target.value })}
                              placeholder="Jane Smith"
                              data-testid="input-employee-name"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="employee-phone">Phone *</Label>
                              <Input
                                id="employee-phone"
                                value={employeeUserForm.phone}
                                onChange={(e) => setEmployeeUserForm({ ...employeeUserForm, phone: e.target.value })}
                                placeholder="+1 (555) 123-4567"
                                data-testid="input-employee-phone"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="employee-email">Email *</Label>
                              <Input
                                id="employee-email"
                                type="email"
                                value={employeeUserForm.email}
                                onChange={(e) => setEmployeeUserForm({ ...employeeUserForm, email: e.target.value })}
                                placeholder="jane@example.com"
                                data-testid="input-employee-email"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="employee-role">Role</Label>
                              <Input
                                id="employee-role"
                                value={employeeUserForm.role}
                                onChange={(e) => setEmployeeUserForm({ ...employeeUserForm, role: e.target.value })}
                                placeholder="staff, manager, admin"
                                data-testid="input-employee-role"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="employee-department">Department</Label>
                              <Input
                                id="employee-department"
                                value={employeeUserForm.department}
                                onChange={(e) => setEmployeeUserForm({ ...employeeUserForm, department: e.target.value })}
                                placeholder="Front Desk, Housekeeping"
                                data-testid="input-employee-department"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="employee-notes">Notes</Label>
                            <Input
                              id="employee-notes"
                              value={employeeUserForm.notes}
                              onChange={(e) => setEmployeeUserForm({ ...employeeUserForm, notes: e.target.value })}
                              placeholder="Internal notes"
                              data-testid="input-employee-notes"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEmployeeUserDialog(false)}>Cancel</Button>
                          <Button 
                            onClick={() => {
                              if (editingEmployeeUser) {
                                updateEmployeeUserMutation.mutate({ id: editingEmployeeUser.id, data: employeeUserForm });
                              } else {
                                createEmployeeUserMutation.mutate(employeeUserForm);
                              }
                            }}
                            disabled={!employeeUserForm.name || !employeeUserForm.phone || !employeeUserForm.email || createEmployeeUserMutation.isPending || updateEmployeeUserMutation.isPending}
                            data-testid="button-save-employee"
                          >
                            {createEmployeeUserMutation.isPending || updateEmployeeUserMutation.isPending ? "Saving..." : editingEmployeeUser ? "Update" : "Add"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Card>
                    <CardContent className="p-0">
                      {employeeUsersQuery.isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading...</div>
                      ) : (employeeUsersQuery.data?.data || []).length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          No employees configured yet.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(employeeUsersQuery.data?.data || []).map((user: EmployeeUser) => (
                              <TableRow key={user.id} data-testid={`row-employee-${user.id}`}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.phone}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell><Badge variant="outline">{user.role || "staff"}</Badge></TableCell>
                                <TableCell className="text-muted-foreground">{user.department || "—"}</TableCell>
                                <TableCell>
                                  <Badge variant={user.isActive ? "default" : "secondary"}>
                                    {user.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingEmployeeUser(user);
                                        setEmployeeUserForm({
                                          name: user.name,
                                          phone: user.phone,
                                          email: user.email,
                                          role: user.role || "staff",
                                          department: user.department || "",
                                          notes: user.notes || ""
                                        });
                                        setEmployeeUserDialog(true);
                                      }}
                                      data-testid={`button-edit-employee-${user.id}`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteEmployeeUserMutation.mutate(user.id)}
                                      disabled={deleteEmployeeUserMutation.isPending}
                                      data-testid={`button-delete-employee-${user.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Investors Section */}
              {userSubTab === "investors" && (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h2 className="text-xl font-semibold">Investor Portal Users</h2>
                      <p className="text-sm text-muted-foreground">Manage investors with their investments and loans</p>
                    </div>
                    <Dialog open={investorUserDialog} onOpenChange={setInvestorUserDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={() => {
                            setEditingInvestorUser(null);
                            setInvestorUserForm({ name: "", phone: "", email: "", mailingAddress: "", notes: "" });
                          }}
                          data-testid="button-add-investor-user"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Investor
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingInvestorUser ? "Edit Investor" : "Add Investor"}</DialogTitle>
                          <DialogDescription>Add an investor to the portal whitelist</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="investor-name">Name *</Label>
                            <Input
                              id="investor-name"
                              value={investorUserForm.name}
                              onChange={(e) => setInvestorUserForm({ ...investorUserForm, name: e.target.value })}
                              placeholder="John Doe"
                              data-testid="input-investor-name"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="investor-phone">Phone *</Label>
                              <Input
                                id="investor-phone"
                                value={investorUserForm.phone}
                                onChange={(e) => setInvestorUserForm({ ...investorUserForm, phone: e.target.value })}
                                placeholder="+1 (555) 123-4567"
                                data-testid="input-investor-phone"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="investor-email">Email *</Label>
                              <Input
                                id="investor-email"
                                type="email"
                                value={investorUserForm.email}
                                onChange={(e) => setInvestorUserForm({ ...investorUserForm, email: e.target.value })}
                                placeholder="john@example.com"
                                data-testid="input-investor-email"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="investor-address">Mailing Address</Label>
                            <Input
                              id="investor-address"
                              value={investorUserForm.mailingAddress}
                              onChange={(e) => setInvestorUserForm({ ...investorUserForm, mailingAddress: e.target.value })}
                              placeholder="123 Main St, City, State ZIP"
                              data-testid="input-investor-address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="investor-notes">Notes</Label>
                            <Input
                              id="investor-notes"
                              value={investorUserForm.notes}
                              onChange={(e) => setInvestorUserForm({ ...investorUserForm, notes: e.target.value })}
                              placeholder="Internal notes"
                              data-testid="input-investor-notes"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setInvestorUserDialog(false)}>Cancel</Button>
                          <Button 
                            onClick={() => {
                              if (editingInvestorUser) {
                                updateInvestorUserMutation.mutate({ id: editingInvestorUser.id, data: investorUserForm });
                              } else {
                                createInvestorUserMutation.mutate(investorUserForm);
                              }
                            }}
                            disabled={!investorUserForm.name || !investorUserForm.phone || !investorUserForm.email || createInvestorUserMutation.isPending || updateInvestorUserMutation.isPending}
                            data-testid="button-save-investor-user"
                          >
                            {createInvestorUserMutation.isPending || updateInvestorUserMutation.isPending ? "Saving..." : editingInvestorUser ? "Update" : "Add"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Investment Dialog */}
                  <Dialog open={investmentDialog} onOpenChange={setInvestmentDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Investment</DialogTitle>
                        <DialogDescription>Record a capital investment</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="investment-date">Investment Date *</Label>
                            <Input
                              id="investment-date"
                              type="date"
                              value={investmentForm.investmentDate}
                              onChange={(e) => setInvestmentForm({ ...investmentForm, investmentDate: e.target.value })}
                              data-testid="input-investment-date"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="investment-amount">Amount ($) *</Label>
                            <Input
                              id="investment-amount"
                              type="number"
                              step="0.01"
                              value={investmentForm.amount}
                              onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
                              placeholder="50000.00"
                              data-testid="input-investment-amount"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="investment-notes">Notes</Label>
                          <Input
                            id="investment-notes"
                            value={investmentForm.notes}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, notes: e.target.value })}
                            placeholder="Investment notes"
                            data-testid="input-investment-notes"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setInvestmentDialog(false)}>Cancel</Button>
                        <Button 
                          onClick={() => {
                            if (selectedInvestorForInvestment) {
                              createInvestmentMutation.mutate({ investorId: selectedInvestorForInvestment, data: investmentForm });
                            }
                          }}
                          disabled={!investmentForm.investmentDate || !investmentForm.amount || createInvestmentMutation.isPending}
                          data-testid="button-save-investment"
                        >
                          {createInvestmentMutation.isPending ? "Saving..." : "Add Investment"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Loan Dialog */}
                  <Dialog open={loanDialog} onOpenChange={setLoanDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Loan</DialogTitle>
                        <DialogDescription>Record a loan arrangement</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="loan-date">Loan Date *</Label>
                            <Input
                              id="loan-date"
                              type="date"
                              value={loanForm.loanDate}
                              onChange={(e) => setLoanForm({ ...loanForm, loanDate: e.target.value })}
                              data-testid="input-loan-date"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="loan-amount">Loan Amount ($) *</Label>
                            <Input
                              id="loan-amount"
                              type="number"
                              step="0.01"
                              value={loanForm.loanAmount}
                              onChange={(e) => setLoanForm({ ...loanForm, loanAmount: e.target.value })}
                              placeholder="100000.00"
                              data-testid="input-loan-amount"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="loan-rate">Interest Rate (%) *</Label>
                            <Input
                              id="loan-rate"
                              type="number"
                              step="0.01"
                              value={loanForm.interestRate}
                              onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })}
                              placeholder="5.50"
                              data-testid="input-loan-rate"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="loan-payment">Monthly Payment ($) *</Label>
                            <Input
                              id="loan-payment"
                              type="number"
                              step="0.01"
                              value={loanForm.monthlyPayment}
                              onChange={(e) => setLoanForm({ ...loanForm, monthlyPayment: e.target.value })}
                              placeholder="1500.00"
                              data-testid="input-loan-payment"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loan-maturity">Maturity Date *</Label>
                          <Input
                            id="loan-maturity"
                            type="date"
                            value={loanForm.maturityDate}
                            onChange={(e) => setLoanForm({ ...loanForm, maturityDate: e.target.value })}
                            data-testid="input-loan-maturity"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loan-notes">Notes</Label>
                          <Input
                            id="loan-notes"
                            value={loanForm.notes}
                            onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                            placeholder="Loan notes"
                            data-testid="input-loan-notes"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setLoanDialog(false)}>Cancel</Button>
                        <Button 
                          onClick={() => {
                            if (selectedInvestorForLoan) {
                              createLoanMutation.mutate({ investorId: selectedInvestorForLoan, data: loanForm });
                            }
                          }}
                          disabled={!loanForm.loanDate || !loanForm.loanAmount || !loanForm.interestRate || !loanForm.monthlyPayment || !loanForm.maturityDate || createLoanMutation.isPending}
                          data-testid="button-save-loan"
                        >
                          {createLoanMutation.isPending ? "Saving..." : "Add Loan"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-4">
                    {investorUsersQuery.isLoading ? (
                      <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
                    ) : (investorUsersQuery.data?.data || []).length === 0 ? (
                      <Card><CardContent className="p-8 text-center text-muted-foreground">No investors configured yet.</CardContent></Card>
                    ) : (
                      (investorUsersQuery.data?.data || []).map((user: InvestorUser) => (
                        <Card key={user.id} data-testid={`card-investor-${user.id}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setExpandedInvestorId(expandedInvestorId === user.id ? null : user.id)}
                                  data-testid={`button-expand-investor-${user.id}`}
                                >
                                  {expandedInvestorId === user.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                                <div>
                                  <CardTitle className="text-lg">{user.name}</CardTitle>
                                  <CardDescription>{user.email} | {user.phone}</CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={user.isActive ? "default" : "secondary"}>
                                  {user.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingInvestorUser(user);
                                    setInvestorUserForm({
                                      name: user.name,
                                      phone: user.phone,
                                      email: user.email,
                                      mailingAddress: user.mailingAddress || "",
                                      notes: user.notes || ""
                                    });
                                    setInvestorUserDialog(true);
                                  }}
                                  data-testid={`button-edit-investor-${user.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteInvestorUserMutation.mutate(user.id)}
                                  disabled={deleteInvestorUserMutation.isPending}
                                  data-testid={`button-delete-investor-${user.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          
                          {expandedInvestorId === user.id && (
                            <CardContent className="pt-4 border-t">
                              <div className="grid md:grid-cols-2 gap-6">
                                {/* Investments Table */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4 text-green-600" />
                                      Investments
                                    </h4>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedInvestorForInvestment(user.id);
                                        setInvestmentForm({ investmentDate: "", amount: "", notes: "" });
                                        setInvestmentDialog(true);
                                      }}
                                      data-testid={`button-add-investment-${user.id}`}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                  {investmentsQuery.isLoading ? (
                                    <div className="text-sm text-muted-foreground">Loading...</div>
                                  ) : (investmentsQuery.data?.data || []).length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No investments recorded</div>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {(investmentsQuery.data?.data || []).map((inv: InvestorInvestment) => (
                                          <TableRow key={inv.id} data-testid={`row-investment-${inv.id}`}>
                                            <TableCell>{new Date(inv.investmentDate).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium text-green-600">
                                              ${parseFloat(inv.amount).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteInvestmentMutation.mutate(inv.id)}
                                                disabled={deleteInvestmentMutation.isPending}
                                                data-testid={`button-delete-investment-${inv.id}`}
                                              >
                                                <Trash2 className="w-3 h-3 text-destructive" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                  {(investmentsQuery.data?.data || []).length > 0 && (
                                    <div className="mt-2 text-sm font-semibold text-green-600">
                                      Total: ${(investmentsQuery.data?.data || []).reduce((sum: number, inv: InvestorInvestment) => sum + parseFloat(inv.amount), 0).toLocaleString()}
                                    </div>
                                  )}
                                </div>

                                {/* Loans Table */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <CreditCard className="w-4 h-4 text-blue-600" />
                                      Loans
                                    </h4>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedInvestorForLoan(user.id);
                                        setLoanForm({ loanDate: "", loanAmount: "", interestRate: "", monthlyPayment: "", maturityDate: "", notes: "" });
                                        setLoanDialog(true);
                                      }}
                                      data-testid={`button-add-loan-${user.id}`}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                  {loansQuery.isLoading ? (
                                    <div className="text-sm text-muted-foreground">Loading...</div>
                                  ) : (loansQuery.data?.data || []).length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No loans recorded</div>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>Rate</TableHead>
                                          <TableHead>Payment</TableHead>
                                          <TableHead>Maturity</TableHead>
                                          <TableHead></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {(loansQuery.data?.data || []).map((loan: InvestorLoan) => (
                                          <TableRow key={loan.id} data-testid={`row-loan-${loan.id}`}>
                                            <TableCell>{new Date(loan.loanDate).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium">${parseFloat(loan.loanAmount).toLocaleString()}</TableCell>
                                            <TableCell>{parseFloat(loan.interestRate).toFixed(2)}%</TableCell>
                                            <TableCell>${parseFloat(loan.monthlyPayment).toLocaleString()}</TableCell>
                                            <TableCell>{new Date(loan.maturityDate).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteLoanMutation.mutate(loan.id)}
                                                disabled={deleteLoanMutation.isPending}
                                                data-testid={`button-delete-loan-${loan.id}`}
                                              >
                                                <Trash2 className="w-3 h-3 text-destructive" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                  {(loansQuery.data?.data || []).length > 0 && (
                                    <div className="mt-2 text-sm font-semibold text-blue-600">
                                      Total: ${(loansQuery.data?.data || []).reduce((sum: number, loan: InvestorLoan) => sum + parseFloat(loan.loanAmount), 0).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
