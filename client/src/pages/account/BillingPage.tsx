import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CreditCard, Plus, Trash2, Star, Loader2, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise() {
  if (!stripePromise) {
    stripePromise = fetch('/api/billing/publishable-key')
      .then(r => r.json())
      .then(data => loadStripe(data.publishableKey))
      .catch(() => null);
  }
  return stripePromise;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

function brandIcon(brand: string) {
  const b = brand?.toLowerCase() || '';
  if (b === 'visa') return 'Visa';
  if (b === 'mastercard') return 'Mastercard';
  if (b === 'amex') return 'Amex';
  if (b === 'discover') return 'Discover';
  return brand?.charAt(0).toUpperCase() + brand?.slice(1) || 'Card';
}

function AddCardForm({ customerId, onSuccess }: { customerId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/billing/setup-intent', {
        method: 'POST',
        body: JSON.stringify({ customerId }),
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    try {
      const { clientSecret } = await setupMutation.mutateAsync();
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) throw new Error(error.message);

      toast({ title: 'Card added successfully' });
      cardElement.clear();
      onSuccess();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to add card', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-muted/20">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#e2e8f0',
                '::placeholder': { color: '#64748b' },
                iconColor: '#94a3b8',
              },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secured by Stripe. Card details never touch our servers.
        </p>
        <Button type="submit" disabled={!stripe || saving} data-testid="button-save-card">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Save Card
        </Button>
      </div>
    </form>
  );
}

function PaymentMethodCard({ pm, customerId, onUpdate }: { pm: PaymentMethod; customerId: string; onUpdate: () => void }) {
  const { toast } = useToast();

  const setDefaultMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/billing/payment-methods/${customerId}/default`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethodId: pm.id }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({ title: 'Default payment method updated' });
      onUpdate();
    },
    onError: (err: any) => toast({ title: err.message || 'Failed', variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/billing/payment-methods/${customerId}/${pm.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: 'Card removed' });
      onUpdate();
    },
    onError: (err: any) => toast({ title: err.message || 'Failed', variant: 'destructive' }),
  });

  return (
    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg" data-testid={`card-payment-method-${pm.id}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-7 bg-muted rounded flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{brandIcon(pm.brand)}</span>
            <span className="text-sm text-muted-foreground font-mono">**** {pm.last4}</span>
            {pm.isDefault && <Badge variant="secondary">Default</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            Expires {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!pm.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDefaultMutation.mutate()}
            disabled={setDefaultMutation.isPending}
            data-testid={`button-set-default-${pm.id}`}
          >
            {setDefaultMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 mr-1" />}
            Set Default
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          data-testid={`button-remove-card-${pm.id}`}
        >
          {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
        </Button>
      </div>
    </div>
  );
}

export function BillingContent() {
  const { toast } = useToast();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showAddCard, setShowAddCard] = useState(false);

  const customersQuery = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const paymentMethodsQuery = useQuery<{ paymentMethods: PaymentMethod[]; defaultPaymentMethodId: string | null }>({
    queryKey: [`/api/billing/payment-methods/${selectedCustomerId}`],
    enabled: !!selectedCustomerId,
  });

  useEffect(() => {
    if (customersQuery.data?.length && !selectedCustomerId) {
      setSelectedCustomerId(customersQuery.data[0].id);
    }
  }, [customersQuery.data, selectedCustomerId]);

  const refreshMethods = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/billing/payment-methods/${selectedCustomerId}`] });
    setShowAddCard(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 bg-white min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-600" />
          Billing & Payment Methods
        </h1>
        <p className="text-slate-600 mt-1">Manage saved payment methods for your customers. Powered by Stripe.</p>
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-3">Select Customer</h2>
        {customersQuery.isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : customersQuery.data?.length ? (
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger data-testid="select-customer">
              <SelectValue placeholder="Choose a customer..." />
            </SelectTrigger>
            <SelectContent>
              {customersQuery.data.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : c.phone ? `(${c.phone})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No customers found. Add customers first in the Customer Manager.</p>
          </div>
        )}
      </Card>

      {selectedCustomerId && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Saved Cards
              </h2>
              <Button
                variant={showAddCard ? 'secondary' : 'default'}
                size="sm"
                onClick={() => setShowAddCard(!showAddCard)}
                data-testid="button-toggle-add-card"
              >
                <Plus className="w-4 h-4 mr-1" />
                {showAddCard ? 'Cancel' : 'Add Card'}
              </Button>
            </div>

            {showAddCard && (
              <div className="mb-6 pb-6 border-b">
                <AddCardForm customerId={selectedCustomerId} onSuccess={refreshMethods} />
              </div>
            )}

            {paymentMethodsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : paymentMethodsQuery.data?.paymentMethods?.length ? (
              <div className="space-y-2">
                {paymentMethodsQuery.data.paymentMethods.map((pm) => (
                  <PaymentMethodCard
                    key={pm.id}
                    pm={pm}
                    customerId={selectedCustomerId}
                    onUpdate={refreshMethods}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No payment methods saved yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add Card" to save a payment method.</p>
              </div>
            )}
          </Card>

          <div className="bg-muted/30 rounded-lg p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Your data is secure</p>
              <p className="text-xs text-muted-foreground">Card details are encrypted and stored directly by Stripe. We never see or store your full card number.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Wraps BillingContent in Stripe Elements; use in full page or in-panel. */
export function BillingContentWithStripe() {
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);

  useEffect(() => {
    getStripePromise().then((s) => {
      setStripeInstance(s);
      setStripeReady(true);
    });
  }, []);

  if (!stripeReady) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stripeInstance) {
    return (
      <div className="p-6 max-w-3xl mx-auto bg-white min-h-full">
        <Card className="p-8 text-center bg-white border-slate-200">
          <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-3" />
          <h2 className="text-lg font-semibold mb-2">Stripe Not Connected</h2>
          <p className="text-sm text-muted-foreground mb-2">Payment processing is not configured. Connect Stripe in the integrations panel to enable billing.</p>
          <p className="text-xs text-muted-foreground">If you are the developer: set STRIPE_PUBLISHABLE_KEY (and optionally STRIPE_SECRET_KEY) in Doppler or env so the publishable-key API returns a valid key.</p>
        </Card>
      </div>
    );
  }

  return (
    <Elements stripe={stripeInstance}>
      <BillingContent />
    </Elements>
  );
}

export default function BillingPage() {
  const [pathname, setLocation] = useLocation();
  const isAppStandalone = pathname.startsWith('/app');

  return (
    <div className="min-h-screen bg-white">
      {isAppStandalone && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/')} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
          </Button>
        </div>
      )}
      <BillingContentWithStripe />
    </div>
  );
}
