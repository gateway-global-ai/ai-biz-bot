import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomerAuth } from "@/lib/customerAuth";
import { useLocation, useRoute } from "wouter";
import { Loader2, Smartphone, X } from "lucide-react";
import WebsitePreview from "@/components/WebsitePreview";
import { AssignSiteModal } from "@/components/AssignSiteModal";
import { Button } from "@/components/ui/button";

export default function CustomerSiteManager() {
  const [, params] = useRoute("/my-account/site/:siteId");
  const siteId = params?.siteId;
  const { token, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const [siteData, setSiteData]       = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    if (!siteId || !token) return;

    fetch(`/api/site-configs/${siteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load site");
        return r.json();
      })
      .then((data) => { setSiteData(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [siteId, token]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <p>Please log in to manage your site.</p>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <p>{error || "Site not found"}</p>
      </div>
    );
  }

  const placeData = siteData.placeData || { name: siteData.name, formatted_address: "" };

  return (
    <div className="relative">
      {/* Assign to phone — floating action button */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <Button
          onClick={() => setShowAssignModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-[14px] shadow-lg shadow-indigo-500/30 text-xs h-9 px-4 font-semibold"
          data-testid="button-assign-site"
        >
          <Smartphone className="w-3.5 h-3.5 mr-1.5" />
          Assign to Phone
        </Button>
      </div>

      {/* Assign modal overlay */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAssignModal(false); }}
          >
            <AssignSiteModal
              siteId={siteId!}
              siteName={siteData.name}
              token={token ?? undefined}
              onClose={() => setShowAssignModal(false)}
              onAssigned={() => {
                // Optionally refresh site data to show invite_sent status
                setShowAssignModal(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <WebsitePreview
        place={placeData}
        siteConfigId={siteId}
        placeId={siteData.placeId || placeData.place_id}
        heroImageUrl={siteData.heroImageUrl}
        onBack={() => setLocation("/my-account")}
      />
    </div>
  );
}
