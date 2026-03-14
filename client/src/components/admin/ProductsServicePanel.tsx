/**
 * Products & Services Panel
 *
 * Per-business product/service catalog with Stripe sync.
 * - Lists existing products by type
 * - Add product/service/subscription with price
 * - Assign an agent to each product (the agent that sells/fulfills it)
 * - "Sync to Stripe" per row → creates Stripe product + price
 * - Shows Stripe product ID when synced
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package, Plus, Zap, Loader2, Trash2, Bot, Check,
  Link2, DollarSign, RefreshCw, ShoppingBag, Repeat,
} from "lucide-react";

interface PlatformProduct {
  id: string;
  siteConfigId: string;
  agentId: string | null;
  name: string;
  description: string | null;
  type: string;
  priceCents: number;
  billingInterval: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  roleType: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  product: {
    label: "Product",
    icon: ShoppingBag,
    color: "bg-blue-500/15 text-blue-300",
  },
  service: {
    label: "Service",
    icon: Bot,
    color: "bg-indigo-500/15 text-indigo-300",
  },
  subscription: {
    label: "Subscription",
    icon: Repeat,
    color: "bg-emerald-500/15 text-emerald-300",
  },
};

function formatPrice(priceCents: number, interval?: string | null): string {
  if (priceCents === 0) return "Free";
  const dollars = (priceCents / 100).toFixed(2);
  if (interval === "month") return `$${dollars}/mo`;
  if (interval === "year") return `$${dollars}/yr`;
  return `$${dollars}`;
}

export function ProductsServicePanel({
  siteConfigId,
  siteAgents = [],
}: {
  siteConfigId: string;
  siteAgents?: Agent[];
}) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<"product" | "service" | "subscription">("service");
  const [newPrice, setNewPrice] = useState("");
  const [newInterval, setNewInterval] = useState<"month" | "year" | "">("");
  const [newAgentId, setNewAgentId] = useState<string>("");
  const [syncOnCreate, setSyncOnCreate] = useState(false);

  const { data: products = [], isLoading } = useQuery<PlatformProduct[]>({
    queryKey: [`/api/platform-products?siteConfigId=${siteConfigId}`],
    queryFn: () =>
      fetch(`/api/platform-products?siteConfigId=${siteConfigId}`).then((r) => r.json()),
  });

  const activeProducts = products.filter((p) => p.isActive);

  const createMutation = useMutation({
    mutationFn: async (data: object) => {
      const res = await fetch("/api/platform-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/platform-products?siteConfigId=${siteConfigId}`],
      });
      toast({ title: "Product created" + (syncOnCreate ? " and synced to Stripe" : "") });
      resetForm();
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const syncMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/platform-products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncStripe: true }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Sync failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/platform-products?siteConfigId=${siteConfigId}`],
      });
      toast({ title: "Synced to Stripe" });
    },
    onError: (e: Error) =>
      toast({ title: "Stripe sync failed", description: e.message, variant: "destructive" }),
  });

  const assignAgentMutation = useMutation({
    mutationFn: async ({ productId, agentId }: { productId: string; agentId: string | null }) => {
      const res = await fetch(`/api/platform-products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/platform-products?siteConfigId=${siteConfigId}`],
      });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/platform-products/${productId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/platform-products?siteConfigId=${siteConfigId}`],
      });
      toast({ title: "Product removed" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setNewName(""); setNewDescription(""); setNewType("service");
    setNewPrice(""); setNewInterval(""); setNewAgentId("");
    setSyncOnCreate(false); setShowAdd(false);
  };

  const handleCreate = () => {
    if (!newName.trim()) return toast({ title: "Name required", variant: "destructive" });
    const priceCents = Math.round(parseFloat(newPrice || "0") * 100) || 0;
    createMutation.mutate({
      siteConfigId,
      name: newName.trim(),
      description: newDescription || undefined,
      type: newType,
      priceCents,
      billingInterval: newType === "subscription" && newInterval ? newInterval : null,
      agentId: newAgentId || null,
      syncStripe: syncOnCreate,
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Products & Services</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {activeProducts.length} item{activeProducts.length !== 1 ? "s" : ""} · sync to Stripe to enable checkout
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-indigo-600 hover:bg-indigo-500 gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-sui border border-indigo-500/30 bg-indigo-600/5 p-5 space-y-4"
        >
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            New Product / Service
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-slate-400">Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Voice AI Concierge Package"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-slate-400">Description</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Short description shown in checkout"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="product" className="text-white">Product (one-time)</SelectItem>
                  <SelectItem value="service" className="text-white">Service (one-time)</SelectItem>
                  <SelectItem value="subscription" className="text-white">Subscription (recurring)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Price (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-800 border-slate-700 text-white pl-8"
                />
              </div>
            </div>
            {newType === "subscription" && (
              <div className="space-y-2">
                <Label className="text-slate-400">Billing Interval</Label>
                <Select value={newInterval} onValueChange={(v) => setNewInterval(v as any)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="month" className="text-white">Monthly</SelectItem>
                    <SelectItem value="year" className="text-white">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-slate-400">Assign Agent (optional)</Label>
              <Select value={newAgentId} onValueChange={setNewAgentId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="" className="text-slate-400">None</SelectItem>
                  {siteAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-white">
                      {a.name} {a.roleType ? `(${a.roleType})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sync option */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={syncOnCreate}
              onChange={(e) => setSyncOnCreate(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-300">Sync to Stripe immediately</span>
          </label>

          <div className="flex gap-3">
            <Button variant="outline" onClick={resetForm}
              className="flex-1 border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              Create
            </Button>
          </div>
        </motion.div>
      )}

      {/* Products list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : activeProducts.length === 0 ? (
        <div className="text-center py-12 rounded-sui border border-dashed border-slate-700">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No products or services yet.</p>
          <p className="text-slate-500 text-xs mt-1">
            Create a product and sync to Stripe to enable checkout.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeProducts.map((product, i) => {
            const typeInfo = TYPE_CONFIG[product.type] || TYPE_CONFIG.service;
            const TypeIcon = typeInfo.icon;
            const assignedAgent = siteAgents.find((a) => a.id === product.agentId);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-4 rounded-sui bg-slate-900/40 border border-slate-800 hover:border-indigo-500/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <TypeIcon className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{product.name}</p>
                      <Badge className={`text-[10px] border-0 ${typeInfo.color}`}>
                        {typeInfo.label}
                      </Badge>
                      <span className="text-sm font-mono text-indigo-300 font-bold">
                        {formatPrice(product.priceCents, product.billingInterval)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{product.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {/* Stripe status */}
                      {product.stripeProductId ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          <span className="font-mono">{product.stripeProductId.slice(0, 20)}…</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncMutation.mutate(product.id)}
                          disabled={syncMutation.isPending}
                          className="h-6 text-xs border-slate-700 text-slate-300 hover:border-indigo-500/50 gap-1"
                        >
                          {syncMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          Sync to Stripe
                        </Button>
                      )}

                      {/* Agent assignment */}
                      <div className="flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-slate-500" />
                        <Select
                          value={product.agentId || ""}
                          onValueChange={(v) =>
                            assignAgentMutation.mutate({
                              productId: product.id,
                              agentId: v || null,
                            })
                          }
                        >
                          <SelectTrigger className="h-6 text-xs bg-slate-800/50 border-slate-700 text-slate-300 w-40 py-0">
                            <SelectValue placeholder="No agent" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="" className="text-slate-400 text-xs">No agent</SelectItem>
                            {siteAgents.map((a) => (
                              <SelectItem key={a.id} value={a.id} className="text-white text-xs">
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Delete */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                    onClick={() => deleteMutation.mutate(product.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Stripe activation note */}
      <div className="rounded-sui border border-slate-800 bg-slate-900/20 p-4 flex items-start gap-3">
        <Link2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-slate-400">
            <span className="text-white font-medium">Stripe Integration</span> — Products synced to Stripe get a
            product ID and price ID. Business owners activate Stripe in their Billing settings
            to enable 2-way checkout communication.
          </p>
        </div>
      </div>
    </div>
  );
}
