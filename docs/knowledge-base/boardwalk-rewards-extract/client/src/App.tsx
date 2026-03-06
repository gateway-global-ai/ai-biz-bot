import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Rooms from "@/pages/Rooms";
import Booking from "@/pages/Booking";
import Groups from "@/pages/Groups";
import Promotion from "@/pages/Promotion";
import Rewards from "@/pages/Rewards";
import Amenities from "@/pages/Amenities";
import Login from "@/pages/Login";
import GuestPortal from "@/pages/GuestPortal";
import AdminDashboard from "@/pages/AdminDashboard";
import InvestorPortal from "@/pages/InvestorPortal";
import CommercialProfile from "@/pages/CommercialProfile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/booking" component={Booking} />
      <Route path="/booking/:roomId" component={Booking} />
      <Route path="/groups" component={Groups} />
      <Route path="/promotion" component={Promotion} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/amenities" component={Amenities} />
      <Route path="/login" component={Login} />
      <Route path="/guest-portal" component={GuestPortal} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/investor" component={InvestorPortal} />
      <Route path="/commercial-profile" component={CommercialProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
