/**
 * Platform Telephony — Global Twilio credentials and sub-accounts.
 * Sovereign UI: glass cards, bg-slate-900/40, border-indigo-500/20.
 * Data: GET/PATCH /api/telephony/config, GET/POST/DELETE /api/twilio/sub-accounts.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Phone, Building2, Loader2, Check, Plus, Trash2, Eye, EyeOff, Zap, Database, RefreshCw } from "lucide-react";

interface TelephonyConfigSafe {
  id: string;
  accountSid?: string | null;
  hasAuthToken?: boolean;
  phoneNumber?: string | null;
  phoneSid?: string | null;
  friendlyName?: string | null;
  messagingServiceSid?: string | null;
  voiceUrl?: string | null;
  statusCallbackUrl?: string | null;
}

interface TwilioSubAccount {
  id: string;
  accountSid: string;
  friendlyName: string;
  ownerEmail?: string | null;
  status: string;
}

export function PlatformTelephony() {
  const { toast } = useToast();
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [accountSid, setAccountSid] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneSid, setPhoneSid] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [messagingServiceSid, setMessagingServiceSid] = useState("");
  const [voiceUrl, setVoiceUrl] = useState("");
  const [statusCallbackUrl, setStatusCallbackUrl] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubEmail, setNewSubEmail] = useState("");

  const { data: config, isLoading: configLoading } = useQuery<TelephonyConfigSafe>({
    queryKey: ["/api/telephony/config"],
  });

  const { data: subAccounts = [], isLoading: subLoading } = useQuery<TwilioSubAccount[]>({
    queryKey: ["/api/twilio/sub-accounts"],
  });

  useEffect(() => {
    if (config) {
      setAccountSid(config.accountSid ?? "");
      setPhoneNumber(config.phoneNumber ?? "");
      setPhoneSid(config.phoneSid ?? "");
      setFriendlyName(config.friendlyName ?? "");
      setMessagingServiceSid(config.messagingServiceSid ?? "");
      setVoiceUrl(config.voiceUrl ?? "");
      setStatusCallbackUrl(config.statusCallbackUrl ?? "");
    }
  }, [config]);

  const checkHasChanges = () => {
    if (!config) return false;
    return (
      (accountSid !== (config.accountSid ?? "")) ||
      (phoneNumber !== (config.phoneNumber ?? "")) ||
      (phoneSid !== (config.phoneSid ?? "")) ||
      (friendlyName !== (config.friendlyName ?? "")) ||
      (messagingServiceSid !== (config.messagingServiceSid ?? "")) ||
      (voiceUrl !== (config.voiceUrl ?? "")) ||
      (statusCallbackUrl !== (config.statusCallbackUrl ?? ""))
    );
  };
  useEffect(() => {
    setHasChanges(checkHasChanges());
  }, [accountSid, phoneNumber, phoneSid, friendlyName, messagingServiceSid, voiceUrl, statusCallbackUrl, config]);

  const updateConfigMutation = useMutation({
    mutationFn: (data: Record<string, string | null>) =>
      apiRequest("PATCH", "/api/telephony/config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/config"] });
      toast({ title: "Telephony configuration updated" });
      setHasChanges(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createSubMutation = useMutation({
    mutationFn: (data: { friendlyName: string; ownerEmail?: string }) =>
      apiRequest("POST", "/api/twilio/sub-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twilio/sub-accounts"] });
      toast({ title: "Sub-account created" });
      setShowCreateSub(false);
      setNewSubName("");
      setNewSubEmail("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSubMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/twilio/sub-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/twilio/sub-accounts"] });
      toast({ title: "Sub-account deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSaveConfig = () => {
    updateConfigMutation.mutate({
      accountSid: accountSid || null,
      phoneNumber: phoneNumber || null,
      phoneSid: phoneSid || null,
      friendlyName: friendlyName || null,
      messagingServiceSid: messagingServiceSid || null,
      voiceUrl: voiceUrl || null,
      statusCallbackUrl: statusCallbackUrl || null,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Global Telephony</h1>
        <p className="text-slate-400 text-sm mt-1">Twilio credentials and sub-accounts (runtime source of truth)</p>
      </div>

      {/* Twilio Credentials */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6"
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
          <Phone className="w-5 h-5 text-indigo-400" />
          Twilio Credentials
        </h2>
        <p className="text-slate-400 text-sm mb-4">Account and webhook URLs. Auth token is stored server-side only.</p>
        {configLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">Account SID</Label>
                <Input
                  value={accountSid}
                  onChange={(e) => setAccountSid(e.target.value)}
                  placeholder="AC..."
                  className="mt-1 bg-slate-800/60 border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-slate-400">Auth Token</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type={showAuthToken ? "text" : "password"}
                    value={config?.hasAuthToken ? "••••••••••••" : ""}
                    placeholder={config?.hasAuthToken ? "••••••••••••" : "Not set"}
                    readOnly
                    className="bg-slate-800/60 border-slate-700 text-slate-400 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="border-slate-600 text-slate-400"
                    onClick={() => setShowAuthToken((s) => !s)}
                  >
                    {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Set via Doppler or database; not editable here.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">Phone Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1..."
                  className="mt-1 bg-slate-800/60 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400">Phone SID</Label>
                <Input
                  value={phoneSid}
                  onChange={(e) => setPhoneSid(e.target.value)}
                  placeholder="PN..."
                  className="mt-1 bg-slate-800/60 border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-400">Messaging Service SID</Label>
              <Input
                value={messagingServiceSid}
                onChange={(e) => setMessagingServiceSid(e.target.value)}
                placeholder="MG..."
                className="mt-1 bg-slate-800/60 border-slate-700 text-white font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-slate-400">Friendly Name</Label>
              <Input
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
                placeholder="AI Agent Trunk"
                className="mt-1 bg-slate-800/60 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-400">Voice URL</Label>
              <Input
                value={voiceUrl}
                onChange={(e) => setVoiceUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 bg-slate-800/60 border-slate-700 text-white text-sm"
              />
            </div>
            <div>
              <Label className="text-slate-400">Status Callback URL</Label>
              <Input
                value={statusCallbackUrl}
                onChange={(e) => setStatusCallbackUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 bg-slate-800/60 border-slate-700 text-white text-sm"
              />
            </div>
            {hasChanges && (
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleSaveConfig}
                  disabled={updateConfigMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Sub-Accounts */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
        className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Sub-Accounts
            </h2>
            <p className="text-slate-400 text-sm mt-1">Twilio sub-accounts for multi-tenant provisioning</p>
          </div>
          <Dialog open={showCreateSub} onOpenChange={setShowCreateSub}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500">
                <Plus className="w-4 h-4 mr-2" />
                Create Sub-Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border border-indigo-500/20">
              <DialogHeader>
                <DialogTitle className="text-white">Create Twilio Sub-Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-slate-400">Account Name</Label>
                  <Input
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="e.g. Client XYZ"
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label className="text-slate-400">Owner Email (optional)</Label>
                  <Input
                    value={newSubEmail}
                    onChange={(e) => setNewSubEmail(e.target.value)}
                    placeholder="owner@example.com"
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-500"
                  onClick={() =>
                    createSubMutation.mutate({
                      friendlyName: newSubName || "Gateway Sub-Account",
                      ownerEmail: newSubEmail || undefined,
                    })
                  }
                  disabled={createSubMutation.isPending}
                >
                  {createSubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {subLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : subAccounts.length === 0 ? (
          <p className="text-slate-400 py-6 text-center">No sub-accounts yet. Create one to provision numbers for clients.</p>
        ) : (
          <ul className="space-y-2">
            {subAccounts.map((acc) => (
              <li
                key={acc.id}
                className="flex items-center justify-between p-3 rounded-sui bg-slate-800/40 border border-slate-700"
              >
                <div>
                  <p className="font-medium text-white">{acc.friendlyName}</p>
                  <p className="text-xs text-slate-400 font-mono">{acc.accountSid}</p>
                  {acc.ownerEmail && (
                    <p className="text-xs text-slate-500">{acc.ownerEmail}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      acc.status === "active"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {acc.status}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:bg-red-500/10"
                    onClick={() => deleteSubMutation.mutate(acc.id)}
                    disabled={deleteSubMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Business Sub-Accounts (Voice Plan subscribers) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
        className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Business Voice Accounts
            </h2>
            <p className="text-slate-400 text-sm mt-1">All businesses with the Voice AI Package active</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/telephony/business/admin/all-sub-accounts"] })}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
        <BusinessVoiceAccountsTable />
      </motion.div>

      {/* Platform Number Pool */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
        className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              Platform Number Pool
            </h2>
            <p className="text-slate-400 text-sm mt-1">Numbers owned by the master account, assignable to any business</p>
          </div>
          <PlatformNumberPoolAdder />
        </div>
        <PlatformNumberPoolTable />
      </motion.div>
    </div>
  );
}

// ── Business Voice Accounts sub-component ────────────────────────────────────

function BusinessVoiceAccountsTable() {
  interface BizSite {
    id: string;
    name: string | null;
    voicePlanActive: boolean;
    voicePlanActivatedAt: string | null;
    voiceSubAccountSid: string | null;
    voiceSubAccountFriendlyName: string | null;
    provisionedPhoneNumber: string | null;
  }
  const { data: sites = [], isLoading } = useQuery<BizSite[]>({
    queryKey: ["/api/telephony/business/admin/all-sub-accounts"],
  });
  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;
  if (!sites.length) return <p className="text-slate-400 text-sm py-4 text-center">No businesses with Voice AI Package yet.</p>;
  return (
    <ul className="space-y-2">
      {sites.map((site) => (
        <li key={site.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-sui bg-slate-800/40 border border-slate-700">
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{site.name || site.id}</p>
            {site.voiceSubAccountSid && (
              <p className="text-xs text-slate-400 font-mono truncate">{site.voiceSubAccountSid}</p>
            )}
            {site.provisionedPhoneNumber && (
              <p className="text-xs text-emerald-400 font-mono">{site.provisionedPhoneNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${site.voicePlanActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
              {site.voicePlanActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
            {site.voiceSubAccountSid ? (
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300">Sub-account</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">No sub-account</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Platform Number Pool sub-components ───────────────────────────────────────

function PlatformNumberPoolAdder() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/telephony/business/admin/number-pool/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaCode }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/business/admin/number-pool"] });
      toast({ title: 'Number added to pool' });
      setOpen(false);
      setAreaCode('');
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-500" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Number to Pool
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border border-indigo-500/20">
        <DialogHeader>
          <DialogTitle className="text-white">Add Number to Platform Pool</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <p className="text-slate-400 text-sm">Purchase a number from the Twilio master account and add it to the assignable pool.</p>
          <div>
            <Label className="text-slate-400">Area Code</Label>
            <Input value={areaCode} onChange={e => setAreaCode(e.target.value.replace(/\D/g,'').slice(0,3))}
              placeholder="702" className="mt-1 bg-slate-800 border-slate-700 text-white font-mono" />
          </div>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-500"
            onClick={() => addMutation.mutate()} disabled={areaCode.length < 3 || addMutation.isPending}>
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Purchase & Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlatformNumberPoolTable() {
  interface PoolNumber { id: string; phoneNumber: string; areaCode: string | null; region: string | null; status: string; assignedToSiteConfigId: string | null; friendlyName: string | null; }
  const { data: pool = [], isLoading } = useQuery<PoolNumber[]>({
    queryKey: ["/api/telephony/business/admin/number-pool"],
  });
  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;
  if (!pool.length) return <p className="text-slate-400 text-sm py-4 text-center">Pool is empty. Add numbers to make them available for assignment.</p>;
  return (
    <ul className="space-y-2">
      {pool.map(num => (
        <li key={num.id} className="flex items-center justify-between gap-3 p-3 rounded-sui bg-slate-800/40 border border-slate-700">
          <div>
            <p className="font-mono text-white font-semibold">{num.phoneNumber}</p>
            <p className="text-xs text-slate-400">{[num.areaCode && `Area ${num.areaCode}`, num.region].filter(Boolean).join(' · ')}</p>
            {num.friendlyName && <p className="text-xs text-slate-500">{num.friendlyName}</p>}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 ${
            num.status === 'available' ? 'bg-emerald-500/20 text-emerald-400' :
            num.status === 'assigned' ? 'bg-indigo-500/20 text-indigo-300' :
            'bg-slate-500/20 text-slate-400'
          }`}>
            {num.status.toUpperCase()}
          </span>
        </li>
      ))}
    </ul>
  );
}
