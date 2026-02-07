import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Plus, Minus, X } from "lucide-react";
import type { CartWithItems, MenuItem } from "@/types/menu";
import { useToast } from "@/hooks/use-toast";

interface ShoppingCartProps {
  siteConfigId: string;
  onCheckout?: () => void;
  onClose?: () => void;
}

export default function ShoppingCartComponent({ siteConfigId, onCheckout, onClose }: ShoppingCartProps) {
  const [cart, setCart] = useState<CartWithItems | null>(null);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getSessionId = () => {
    return localStorage.getItem("cart_session_id") || null;
  };

  useEffect(() => {
    loadCart();
  }, [siteConfigId]);

  const loadCart = async () => {
    try {
      const sessionId = getSessionId();
      const queryParam = sessionId ? `sessionId=${sessionId}` : "";
      const response = await fetch(`/api/cart/${siteConfigId}${queryParam ? `?${queryParam}` : ""}`);
      if (!response.ok) throw new Error("Failed to load cart");
      
      const cartData = await response.json();
      setCart(cartData);

      // Load menu item details
      const itemIds = cartData.items.map((item: any) => item.menuItemId);
      await loadMenuItems(itemIds);
    } catch (error) {
      console.error("Error loading cart:", error);
      toast({
        title: "Error",
        description: "Failed to load cart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async (itemIds: string[]) => {
    const items: Record<string, MenuItem> = {};
    
    // Fetch each menu item
    for (const itemId of itemIds) {
      try {
        const response = await fetch(`/api/menu-items/${itemId}`);
        if (response.ok) {
          const itemData = await response.json();
          items[itemId] = itemData;
        }
      } catch (error) {
        console.error(`Error loading menu item ${itemId}:`, error);
      }
    }
    
    setMenuItems(items);
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(itemId);
      return;
    }

    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) throw new Error("Failed to update quantity");

      await loadCart();
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove item");

      await loadCart();
      toast({
        title: "Removed",
        description: "Item removed from cart",
      });
    } catch (error) {
      console.error("Error removing item:", error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  const clearCart = async () => {
    if (!cart) return;

    try {
      const response = await fetch(`/api/cart/${cart.cart.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to clear cart");

      await loadCart();
      toast({
        title: "Cart cleared",
        description: "All items removed from cart",
      });
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading cart...</div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Shopping Cart
            </CardTitle>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">Your cart is empty</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shopping Cart ({cart.items.length} {cart.items.length === 1 ? "item" : "items"})
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg">
              <div className="flex-1">
                <div className="text-white font-medium">
                  {menuItems[item.menuItemId]?.name || "Loading..."}
                </div>
                <div className="text-sm text-slate-400">
                  ${parseFloat(item.unitPrice).toFixed(2)} each
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="h-8 w-8 p-0 border-slate-600"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-white font-medium min-w-[2rem] text-center">
                  {item.quantity}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="h-8 w-8 p-0 border-slate-600"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              <div className="text-white font-semibold min-w-[4rem] text-right">
                ${parseFloat(item.totalPrice).toFixed(2)}
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeItem(item.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-950"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Separator className="bg-slate-700" />

        {/* Cart Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>Subtotal</span>
            <span>${parseFloat(cart.cart.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Tax</span>
            <span>${parseFloat(cart.cart.taxAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Delivery Fee</span>
            <span>${parseFloat(cart.cart.deliveryFee).toFixed(2)}</span>
          </div>
          <Separator className="bg-slate-700" />
          <div className="flex justify-between text-white text-lg font-bold">
            <span>Total</span>
            <span>${parseFloat(cart.cart.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={clearCart}
            className="flex-1 border-slate-600 text-slate-300 hover:text-white"
          >
            Clear Cart
          </Button>
          <Button
            onClick={onCheckout}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            Checkout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
