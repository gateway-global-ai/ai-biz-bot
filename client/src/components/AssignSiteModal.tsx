/**
 * AssignSiteModal — admin/reseller tool to assign a generated website
 * to a business owner's cell phone number and fire the claim invite SMS.
 *
 * Usage:
 *   <AssignSiteModal siteId={site.id} siteName={site.name} token={adminToken} />
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Send, CheckCircle2, Copy, X, AlertTriangle,
  ExternalLink, RefreshCw, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AssignResult {
  claimUrl: string;
  previewUrl: string;
  smsSent: boolean;
  assignedToPhone: string;
  expiresAt: string;
}

interface AssignSiteModalProps {
  siteId: string;
  siteName: string;
  /** Bearer token for admin/reseller auth */
  token?: string;
  /** Called when the modal should close */
  onClose?: () => void;
  /** Called after a successful assignment */
  onAssigned?: (result: AssignResult) => void;
}

export function AssignSiteModal({
  siteId,
  siteName,
  token,
  onClose,
  onAssigned,
}: AssignSiteModalProps) {
  const { toast } = useToast();
  const [phone, setPhone]           = useState("");
  const [customMsg, setCustomMsg]   = useState("");
  const [showCustomMsg, setShowCustomMsg] = useState(false);
  const [busy, setBusy]             = useState(false);
  const [result, setResult]         = useState<AssignResult | null>(null);
  const [copied, setCopied]         = useState<"claim" | "preview" | null>(null);

  const handleAssign = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a 10-digit US number.", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sites/${siteId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phone: `+1${digits.slice(-10)}`,
          ...(customMsg.trim() ? { message: customMsg.trim() } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");

      setResult(data);
      onAssigned?.(data);
      toast({
        title: data.smsSent ? "Invite sent via SMS! 📱" : "Invite created (SMS unavailable)",
        description: `Claim link sent to ${data.assignedToPhone.slice(-4).padStart(phone.length, "•")}`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, type: "claim" | "preview") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1,    y: 0 }}
      exit={{ opacity: 0,  scale: 0.97, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-sui bg-slate-900/80 backdrop-blur-xl border border-indigo-500/20 shadow-2xl p-6 w-full max-w-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Assign Website</h3>
          </div>
          <p className="text-xs text-slate-500 leading-snug max-w-[240px]">
            Send an SMS invite to the business owner so they can claim <strong className="text-slate-300">"{siteName}"</strong>.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[10px] hover:bg-slate-800/60 text-slate-500 hover:text-slate-300 transition-colors shrink-0">
            <X size={15} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">
            {/* Phone input */}
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">Business owner's cell phone</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 bg-slate-800/60 border border-slate-700/40 rounded-[10px] px-3 h-10 flex items-center shrink-0">
                  🇺🇸 +1
                </span>
                <Input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-600 rounded-[10px]"
                  data-testid="input-assign-phone"
                />
              </div>
            </div>

            {/* Custom message toggle */}
            <div>
              <button
                onClick={() => setShowCustomMsg(!showCustomMsg)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {showCustomMsg ? "− Remove custom message" : "+ Add custom intro message (optional)"}
              </button>
              <AnimatePresence>
                {showCustomMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <textarea
                      rows={3}
                      placeholder={`Hi [Name], I built you a free AI website for ${siteName}…`}
                      value={customMsg}
                      onChange={(e) => setCustomMsg(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700/40 text-white text-xs rounded-[10px] px-3 py-2.5 placeholder:text-slate-600 resize-none focus:outline-none focus:border-indigo-500/40"
                    />
                    <p className="text-[10px] text-slate-600 mt-1">The claim + preview links are added automatically.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* What they'll receive */}
            <div className="rounded-[14px] bg-slate-800/30 border border-slate-700/30 p-3 space-y-1.5">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">They'll receive:</p>
              {[
                "Preview link to tour their AI website",
                "$49.99 claim & activate link (expires 7 days)",
                "OTP verification before payment",
                "Welcome SMS after activation",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <Button
              onClick={handleAssign}
              disabled={busy || phone.replace(/\D/g, "").length < 10}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[14px] font-semibold text-sm shadow-lg shadow-indigo-500/20"
              data-testid="button-send-invite"
            >
              {busy ? (
                <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Sending…</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Send Invite SMS</>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">
            {/* Success banner */}
            <div className={`rounded-[14px] p-3 border flex items-start gap-3 ${
              result.smsSent
                ? "bg-emerald-950/40 border-emerald-500/20"
                : "bg-amber-950/40 border-amber-500/20"
            }`}>
              {result.smsSent
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
              <div>
                <p className={`text-xs font-semibold ${result.smsSent ? "text-emerald-300" : "text-amber-300"}`}>
                  {result.smsSent ? "SMS sent successfully!" : "SMS unavailable — copy links manually"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Sent to {result.assignedToPhone} · expires {new Date(result.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Claim link */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Claim Link (share if SMS failed)</p>
              <div className="flex items-center gap-2 p-2.5 rounded-[10px] bg-slate-800/40 border border-slate-700/30">
                <span className="text-[10px] text-slate-400 font-mono truncate flex-1">{result.claimUrl}</span>
                <button onClick={() => copy(result.claimUrl, "claim")}
                  className="shrink-0 text-slate-500 hover:text-indigo-400 transition-colors">
                  {copied === "claim" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a href={result.claimUrl} target="_blank" rel="noreferrer"
                  className="shrink-0 text-slate-500 hover:text-indigo-400 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Preview link */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Preview Link</p>
              <div className="flex items-center gap-2 p-2.5 rounded-[10px] bg-slate-800/40 border border-slate-700/30">
                <span className="text-[10px] text-slate-400 font-mono truncate flex-1">{result.previewUrl}</span>
                <button onClick={() => copy(result.previewUrl, "preview")}
                  className="shrink-0 text-slate-500 hover:text-indigo-400 transition-colors">
                  {copied === "preview" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Send to another number */}
            <Button variant="outline" onClick={() => { setResult(null); setPhone(""); }}
              className="w-full border-slate-700/40 text-slate-400 hover:text-white hover:border-indigo-500/30 rounded-[14px] text-xs h-9">
              <Phone className="w-3.5 h-3.5 mr-1.5" />Send to a different number
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
