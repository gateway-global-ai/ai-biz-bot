import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Calendar, Loader2, ExternalLink } from "lucide-react";
import CommissionReport from "./CommissionReport";
import GrowthCalculator from "./GrowthCalculator";

function getAuthHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export default function PayoutDashboard() {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [onboarding, setOnboarding] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["/api/reseller/status"],
    enabled: isAuthenticated && !!token,
    queryFn: async () => {
      const res = await fetch("/api/reseller/status", { headers: getAuthHeaders(token) });
      if (!res.ok) {
        if (res.status === 403) return { stripeConnectId: null, balance: null };
        throw new Error(await res.text());
      }
      return res.json();
    },
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reseller/onboard", {
        method: "POST",
        headers: getAuthHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Onboarding started", description: "Complete the steps in the new tab." });
        queryClient.invalidateQueries({ queryKey: ["/api/reseller/status"] });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Onboarding failed", description: e.message, variant: "destructive" });
      setOnboarding(false);
    },
  });

  const handleCompleteOnboarding = () => {
    setOnboarding(true);
    onboardMutation.mutate(undefined);
  };

  if (!isAuthenticated) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Sign in to access the reseller payout dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8">
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  const connected = !!status?.stripeConnectId;

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Reseller Payouts
          </CardTitle>
          <CardDescription>
            Manage your Stripe Connect account and view your available balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!connected ? (
            <>
              <p className="text-sm text-muted-foreground">
                Complete Stripe Express onboarding to receive weekly payouts for your commissions.
              </p>
              <Button
                onClick={handleCompleteOnboarding}
                disabled={onboarding}
              >
                {onboarding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    Complete Onboarding
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Available balance</p>
                  <p className="text-2xl font-semibold">
                    ${typeof status?.balance === "number" ? status.balance.toFixed(2) : "0.00"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Next payout: Friday (weekly).
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCompleteOnboarding}
                disabled={onboarding}
              >
                Update payout details
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <CommissionReport />
      <GrowthCalculator />
    </div>
  );
}
