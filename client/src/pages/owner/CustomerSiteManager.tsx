import { useState, useEffect } from "react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { useLocation, useRoute } from "wouter";
import { Loader2 } from "lucide-react";
import WebsitePreview from "@/components/WebsitePreview";

export default function CustomerSiteManager() {
  const [, params] = useRoute("/my-account/site/:siteId");
  const siteId = params?.siteId;
  const { token, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const [siteData, setSiteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId || !token) return;

    fetch(`/api/site-configs/${siteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load site");
        return r.json();
      })
      .then((data) => {
        setSiteData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [siteId, token]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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

  const placeData = siteData.placeData || {
    name: siteData.name,
    formatted_address: "",
  };

  return (
    <WebsitePreview
      place={placeData}
      siteConfigId={siteId}
      placeId={siteData.placeId || placeData.place_id}
      heroImageUrl={siteData.heroImageUrl}
      onBack={() => setLocation("/my-account")}
    />
  );
}
