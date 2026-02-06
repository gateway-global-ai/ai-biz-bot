import { useState } from "react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { PLAN_LIMITS, type PlanType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  User,
  Phone,
  Mail,
  Building2,
  Crown,
  LogOut,
  ArrowLeft,
  Globe,
  Bot,
  Loader2,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import gatewayLogo from "@assets/gatewaylogo_header_left_1770354860467.png";

export default function MyAccount() {
  const { user, token, logout, updateUser, isAuthenticated, isLoading } = useCustomerAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");

  const businessesQuery = useQuery({
    queryKey: ["/api/customer/businesses"],
    queryFn: async () => {
      const res = await fetch("/api/customer/businesses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load businesses");
      const data = await res.json();
      return data.businesses;
    },
    enabled: isAuthenticated,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { name?: string; email?: string }) => {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.user) updateUser(data.user);
      setEditingName(false);
      setEditingEmail(false);
      toast({ title: "Profile Updated" });
    },
  });

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

  const plan = (user.plan || "free") as PlanType;
  const planInfo = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const businesses = businessesQuery.data || [];

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

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-my-account-title">
            My Account
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your profile, plan, and business websites.
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profile</h2>
              <p className="text-sm text-slate-400">Your account information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Phone</span>
              </div>
              <span className="text-white font-mono text-sm" data-testid="text-phone">{user.phone}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Name</span>
              </div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="h-8 w-48 bg-slate-800 border-slate-700 text-white text-sm"
                    data-testid="input-name"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => updateProfileMutation.mutate({ name: nameValue })}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-name"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                  </Button>
                </div>
              ) : (
                <button
                  className="text-white text-sm hover:text-blue-400 transition-colors cursor-pointer"
                  onClick={() => {
                    setNameValue(user.name || "");
                    setEditingName(true);
                  }}
                  data-testid="button-edit-name"
                >
                  {user.name || "Add your name"}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Email</span>
              </div>
              {editingEmail ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    className="h-8 w-48 bg-slate-800 border-slate-700 text-white text-sm"
                    type="email"
                    data-testid="input-email"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => updateProfileMutation.mutate({ email: emailValue })}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-email"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                  </Button>
                </div>
              ) : (
                <button
                  className="text-white text-sm hover:text-blue-400 transition-colors cursor-pointer"
                  onClick={() => {
                    setEmailValue(user.email || "");
                    setEditingEmail(true);
                  }}
                  data-testid="button-edit-email"
                >
                  {user.email || "Add your email"}
                </button>
              )}
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Plan</h2>
                <p className="text-sm text-slate-400">Your current subscription</p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={
                plan === "enterprise"
                  ? "bg-violet-500/20 text-violet-300"
                  : plan === "pro"
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-slate-700 text-slate-300"
              }
            >
              {planInfo.label}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(Object.entries(PLAN_LIMITS) as [PlanType, typeof PLAN_LIMITS[PlanType]][]).map(
              ([key, info]) => (
                <div
                  key={key}
                  className={`rounded-md border p-4 text-center ${
                    key === plan
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-800/50"
                  }`}
                  data-testid={`plan-card-${key}`}
                >
                  <p className="text-sm font-semibold text-white mb-1">{info.label}</p>
                  <p className="text-2xl font-bold text-white">
                    {info.price === 0 ? "Free" : `$${info.price}`}
                    {info.price > 0 && (
                      <span className="text-xs text-slate-400 font-normal">/mo</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {info.maxBusinesses >= 999
                      ? "Unlimited"
                      : `${info.maxBusinesses} business${info.maxBusinesses > 1 ? "es" : ""}`}
                  </p>
                  {key === plan ? (
                    <Badge variant="secondary" className="mt-3 bg-blue-500/20 text-blue-300">
                      Current
                    </Badge>
                  ) : key !== "free" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      data-testid={`button-upgrade-${key}`}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Upgrade
                    </Button>
                  ) : null}
                </div>
              )
            )}
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">My Businesses</h2>
                <p className="text-sm text-slate-400">
                  {businesses.length} of {planInfo.maxBusinesses >= 999 ? "unlimited" : planInfo.maxBusinesses} used
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/business")}
              data-testid="button-add-business"
            >
              <Globe className="w-4 h-4 mr-2" />
              Add Business
            </Button>
          </div>

          {businessesQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-700 rounded-md">
              <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm mb-4">
                No businesses yet. Generate your first AI-powered website!
              </p>
              <Button
                variant="default"
                onClick={() => setLocation("/business")}
                data-testid="button-create-first"
              >
                Get Started
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {businesses.map((biz: any) => (
                <div
                  key={biz.id}
                  className="flex items-center justify-between gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-md"
                  data-testid={`business-row-${biz.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{biz.name}</p>
                      {biz.domain && (
                        <p className="text-xs text-slate-500 truncate">{biz.domain}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                      {biz.chatbotEnabled ? "Live" : "Draft"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(`/my-account/site/${biz.id}`)}
                      data-testid={`button-manage-${biz.id}`}
                    >
                      Manage
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
