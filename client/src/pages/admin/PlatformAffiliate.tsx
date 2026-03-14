/**
 * Platform Affiliate — tabbed wrapper: Analytics (ResellerAnalytics), Payouts (PayoutDashboard), Commissions.
 * Composes existing components and GET /api/reseller/commissions.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResellerAnalytics from "@/pages/reseller/ResellerAnalytics";
import PayoutDashboard from "@/components/reseller/PayoutDashboard";
import CommissionReport from "@/components/reseller/CommissionReport";
import { BarChart3, Banknote, DollarSign } from "lucide-react";

export function PlatformAffiliate() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Affiliate Program</h1>
        <p className="text-slate-400 text-sm mt-1">Reseller analytics, payouts, and commission ledger</p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="bg-slate-900/60 border border-indigo-500/20">
          <TabsTrigger value="analytics" className="data-[state=active]:bg-indigo-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="payouts" className="data-[state=active]:bg-indigo-600">
            <Banknote className="w-4 h-4 mr-2" />
            Payouts
          </TabsTrigger>
          <TabsTrigger value="commissions" className="data-[state=active]:bg-indigo-600">
            <DollarSign className="w-4 h-4 mr-2" />
            Commissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4">
          <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6">
            <ResellerAnalytics siteId="" siteName="Platform" />
          </div>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6">
            <PayoutDashboard />
          </div>
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6">
            <CommissionReport />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
