import { useState } from "react";
import StandardizedChatInterface from "@/components/StandardizedChatInterface";
import MenuDisplay from "@/components/MenuDisplay";
import ShoppingCartComponent from "@/components/ShoppingCart";
import Checkout from "@/components/Checkout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, UtensilsCrossed, ShoppingCart } from "lucide-react";
import type { CartWithItems } from "@/types/menu";

export default function CustomerChatInterface() {
  const [activeTab, setActiveTab] = useState("chat");
  const [cart, setCart] = useState<CartWithItems | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const siteConfigId = "customer-portal";

  const handleCartUpdate = (updatedCart: CartWithItems) => {
    setCart(updatedCart);
  };

  const handleCheckout = () => {
    setActiveTab("cart");
    setShowCheckout(true);
  };

  const handleCheckoutComplete = (orderId: string) => {
    console.log("Order completed:", orderId);
    setShowCheckout(false);
    setActiveTab("chat");
    // Cart will be cleared/updated automatically by the checkout component
  };

  const cartItemCount = cart?.items.length || 0;

  return (
    <div className="h-screen w-full bg-slate-950">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-slate-800 bg-slate-900 px-6 py-3">
          <h1 className="text-2xl font-bold text-white mb-3">Customer Portal</h1>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="chat" className="data-[state=active]:bg-purple-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="menu" className="data-[state=active]:bg-purple-600">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="cart" className="data-[state=active]:bg-purple-600 relative">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Cart
              {cartItemCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 rounded-full h-5 min-w-[1.25rem] px-1.5"
                >
                  {cartItemCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 m-0 p-0 overflow-hidden">
          <div className="h-full flex items-center justify-center">
            <div className="w-full h-full max-w-7xl">
              <StandardizedChatInterface
                mode="customer"
                siteConfigId={siteConfigId}
                botName="AI Biz Bot"
                greetingMessage="Welcome! I'm here to help you. Browse our menu, chat with me, or place an order. How can I assist you today?"
                fullscreen={true}
              />
            </div>
          </div>
        </TabsContent>

        {/* Menu Tab */}
        <TabsContent value="menu" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <MenuDisplay 
              siteConfigId={siteConfigId}
              onCartUpdate={handleCartUpdate}
            />
          </div>
        </TabsContent>

        {/* Cart Tab */}
        <TabsContent value="cart" className="flex-1 m-0 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {showCheckout && cart ? (
              <Checkout
                siteConfigId={siteConfigId}
                cart={cart}
                onComplete={handleCheckoutComplete}
                onCancel={() => setShowCheckout(false)}
              />
            ) : (
              <ShoppingCartComponent
                siteConfigId={siteConfigId}
                onCheckout={handleCheckout}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
