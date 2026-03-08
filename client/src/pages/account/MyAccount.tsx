/**
 * @ADMIN-DASHBOARD-KERNEL
 * @STABILITY_LEVEL: IMMUTABLE
 * @DEPENDENCIES: Google Maps JS API (gmp-select), Auth Session
 * @NOTE: Do not modify event listeners or auth-guards without explicit bypass.
 */
import { useCustomerAuth } from "@/lib/customerAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";
import { Loader2 } from "lucide-react";
import gatewayLogo from "@assets/gatewaylogo_header_left_1770354860467.png";
import { ProfileContent } from "@/components/account/ProfileContent";

export default function MyAccount() {
  const { user, logout, isAuthenticated, isLoading } = useCustomerAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-200">
        <p>Please log in to view your account.</p>
        <Button variant="outline" onClick={() => setLocation("/business")} data-testid="button-go-login">
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4 overflow-visible">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/business")}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img
            src={gatewayLogo}
            alt="Gateway Global AI"
            className="h-10 w-auto opacity-90"
          />
        </div>
        <Button
          variant="ghost"
          onClick={async () => {
            await logout();
            setLocation("/business");
          }}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </nav>

      <ProfileContent />
    </div>
  );
}
