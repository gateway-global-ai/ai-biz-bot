import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import type { CartWithItems } from "@/types/menu";
import { useToast } from "@/hooks/use-toast";

interface CheckoutProps {
  siteConfigId: string;
  cart: CartWithItems;
  onComplete?: (orderId: string) => void;
  onCancel?: () => void;
}

export default function Checkout({ siteConfigId, cart, onComplete, onCancel }: CheckoutProps) {
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const { toast } = useToast();

  const handleSubmitOrder = async () => {
    // Validation
    if (!customerName.trim()) {
      toast({
        title: "Required Field",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (!customerPhone.trim()) {
      toast({
        title: "Required Field",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast({
        title: "Required Field",
        description: "Please enter a delivery address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteConfigId,
          cartId: cart.cart.id,
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          orderType,
          deliveryAddress: orderType === "delivery" ? deliveryAddress : undefined,
          deliveryInstructions: deliveryInstructions || undefined,
          subtotal: cart.cart.subtotal,
          taxAmount: cart.cart.taxAmount,
          deliveryFee: orderType === "delivery" ? cart.cart.deliveryFee : "0",
          totalAmount: orderType === "delivery" 
            ? cart.cart.totalAmount 
            : (parseFloat(cart.cart.subtotal) + parseFloat(cart.cart.taxAmount)).toFixed(2),
          paymentMethod,
          paymentStatus: "pending",
          status: "pending",
        }),
      });

      if (!response.ok) throw new Error("Failed to create order");

      const order = await response.json();
      setOrderNumber(order.orderNumber);
      setOrderComplete(true);

      toast({
        title: "Order Placed!",
        description: `Your order #${order.orderNumber} has been placed successfully`,
      });

      if (onComplete) {
        onComplete(order.id);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="bg-green-500/20 rounded-full p-4">
                <CheckCircle2 className="w-16 h-16 text-green-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Order Confirmed!</h2>
              <p className="text-slate-300">Order Number: <span className="font-mono font-bold">{orderNumber}</span></p>
            </div>
            <div className="text-slate-400 space-y-2">
              <p>We've received your order and will start preparing it shortly.</p>
              {orderType === "delivery" && (
                <p>Estimated delivery time: 30-45 minutes</p>
              )}
              {orderType === "pickup" && (
                <p>Your order will be ready for pickup in 20-30 minutes</p>
              )}
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Place Another Order
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Checkout</CardTitle>
        <CardDescription>Complete your order</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Type */}
        <div className="space-y-2">
          <Label className="text-white">Order Type</Label>
          <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value as "delivery" | "pickup")}>
            <div className="flex items-center space-x-2 bg-slate-900 p-3 rounded-lg">
              <RadioGroupItem value="delivery" id="delivery" />
              <Label htmlFor="delivery" className="text-slate-200 flex-1 cursor-pointer">
                Delivery
              </Label>
            </div>
            <div className="flex items-center space-x-2 bg-slate-900 p-3 rounded-lg">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="text-slate-200 flex-1 cursor-pointer">
                Pickup
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Customer Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Name *</Label>
            <Input
              id="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="john@example.com"
            />
          </div>
        </div>

        {/* Delivery Address (if delivery) */}
        {orderType === "delivery" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address" className="text-white">Delivery Address *</Label>
              <Textarea
                id="address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
                placeholder="123 Main St, Apt 4B, City, State 12345"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions" className="text-white">Delivery Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
                placeholder="Ring doorbell, leave at door, etc."
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="space-y-2">
          <Label className="text-white">Payment Method</Label>
          <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "card" | "cash")}>
            <div className="flex items-center space-x-2 bg-slate-900 p-3 rounded-lg">
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="text-slate-200 flex-1 cursor-pointer">
                Credit/Debit Card
              </Label>
            </div>
            <div className="flex items-center space-x-2 bg-slate-900 p-3 rounded-lg">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash" className="text-slate-200 flex-1 cursor-pointer">
                Cash on {orderType === "delivery" ? "Delivery" : "Pickup"}
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator className="bg-slate-700" />

        {/* Order Summary */}
        <div className="space-y-2">
          <h3 className="font-semibold text-white">Order Summary</h3>
          <div className="flex justify-between text-slate-300">
            <span>Subtotal</span>
            <span>${parseFloat(cart.cart.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Tax</span>
            <span>${parseFloat(cart.cart.taxAmount).toFixed(2)}</span>
          </div>
          {orderType === "delivery" && (
            <div className="flex justify-between text-slate-300">
              <span>Delivery Fee</span>
              <span>${parseFloat(cart.cart.deliveryFee).toFixed(2)}</span>
            </div>
          )}
          <Separator className="bg-slate-700" />
          <div className="flex justify-between text-white text-lg font-bold">
            <span>Total</span>
            <span>
              ${orderType === "delivery" 
                ? parseFloat(cart.cart.totalAmount).toFixed(2)
                : (parseFloat(cart.cart.subtotal) + parseFloat(cart.cart.taxAmount)).toFixed(2)
              }
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-slate-600 text-slate-300 hover:text-white"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitOrder}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            disabled={loading}
          >
            {loading ? "Processing..." : "Place Order"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
