/**
 * Platform Billing — tabbed wrapper: Payment Methods, Usage & Metering, Energy Wallet, Plans.
 * Composes BillingContentWithStripe, BillingHistory, PrepaidWallet; no new APIs.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingContentWithStripe } from "@/pages/account/BillingPage";
import { BillingHistory } from "@/components/dashboard/BillingHistory";
import { PrepaidWallet } from "@/components/billing/PrepaidWallet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, BarChart3, Wallet, Package, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SiteConfig { id: string; name: string; domain?: string | null }

export function PlatformBilling() {
  const [energySiteId, setEnergySiteId] = useState<string>("");

  const { data: siteConfigs = [], isLoading: sitesLoading } = useQuery<SiteConfig[]>({
    queryKey: ["/api/site-configs"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/site-configs");
      const json = await r.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const firstSiteId = siteConfigs[0]?.id ?? "";
  const effectiveSiteId = energySiteId || firstSiteId;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Billing Engine</h1>
        <p className="text-slate-400 text-sm mt-1">Payment methods, usage, energy wallet, and plans</p>
      </div>

      <Tabs defaultValue="payment-methods" className="space-y-4">
        <TabsList className="bg-slate-900/60 border border-indigo-500/20">
          <TabsTrigger value="payment-methods" className="data-[state=active]:bg-indigo-600">
            <CreditCard className="w-4 h-4 mr-2" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-indigo-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Usage & Metering
          </TabsTrigger>
          <TabsTrigger value="energy" className="data-[state=active]:bg-indigo-600">
            <Wallet className="w-4 h-4 mr-2" />
            Energy Wallet
          </TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-indigo-600">
            <Package className="w-4 h-4 mr-2" />
            Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment-methods" className="mt-4">
          <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6">
            <BillingContentWithStripe />
          </div>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6">
            <BillingHistory />
          </div>
        </TabsContent>

        <TabsContent value="energy" className="mt-4">
          <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6">
            {sitesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              </div>
            ) : siteConfigs.length === 0 ? (
              <Card className="bg-slate-800/40 border-slate-700">
                <CardContent className="pt-6">
                  <p className="text-slate-400">No site configs. Create a business first to use Energy Wallet.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-sm text-slate-400 block mb-2">Business (for Energy Wallet)</label>
                  <Select value={effectiveSiteId} onValueChange={setEnergySiteId}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white max-w-xs">
                      <SelectValue placeholder="Select business" />
                    </SelectTrigger>
                    <SelectContent>
                      {siteConfigs.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <PrepaidWallet
                  siteConfigId={effectiveSiteId}
                  businessName={siteConfigs.find((s) => s.id === effectiveSiteId)?.name ?? "Business"}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <Card className="rounded-sui bg-slate-900/40 border border-indigo-500/20">
            <CardHeader>
              <CardTitle className="text-white">Subscription & Plans</CardTitle>
              <CardDescription className="text-slate-400">
                Create a checkout session to subscribe. Use the Billing page or app billing flow for subscription checkout.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm">
                Subscription checkout: <code className="text-indigo-400">POST /api/subscriptions/create-checkout-session</code>.
                Manage via Payment Methods tab or the main Billing page.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
