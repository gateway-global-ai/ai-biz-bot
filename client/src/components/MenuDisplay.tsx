import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import type { MenuWithDetails, MenuItem, CartWithItems } from "@/types/menu";
import { useToast } from "@/hooks/use-toast";

interface MenuDisplayProps {
  siteConfigId: string;
  onCartUpdate?: (cart: CartWithItems) => void;
}

export default function MenuDisplay({ siteConfigId, onCartUpdate }: MenuDisplayProps) {
  const [menus, setMenus] = useState<MenuWithDetails[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuWithDetails | null>(null);
  const [cart, setCart] = useState<CartWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Generate or get session ID for anonymous users
  const getSessionId = () => {
    let sessionId = localStorage.getItem("cart_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("cart_session_id", sessionId);
    }
    return sessionId;
  };

  useEffect(() => {
    loadMenus();
    loadCart();
  }, [siteConfigId]);

  const loadMenus = async () => {
    try {
      const response = await fetch(`/api/menus/${siteConfigId}`);
      if (!response.ok) throw new Error("Failed to load menus");
      
      const menuList = await response.json();
      
      // Load details for each menu
      const menusWithDetails = await Promise.all(
        menuList.map(async (menu: any) => {
          const detailsResponse = await fetch(`/api/menus/${siteConfigId}/${menu.id}`);
          return await detailsResponse.json();
        })
      );
      
      setMenus(menusWithDetails);
      if (menusWithDetails.length > 0) {
        setSelectedMenu(menusWithDetails[0]);
      }
    } catch (error) {
      console.error("Error loading menus:", error);
      toast({
        title: "Error",
        description: "Failed to load menus",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const sessionId = getSessionId();
      const queryParam = sessionId ? `sessionId=${sessionId}` : "";
      const response = await fetch(`/api/cart/${siteConfigId}${queryParam ? `?${queryParam}` : ""}`);
      if (!response.ok) throw new Error("Failed to load cart");
      
      const cartData = await response.json();
      setCart(cartData);
      if (onCartUpdate) {
        onCartUpdate(cartData);
      }
    } catch (error) {
      console.error("Error loading cart:", error);
    }
  };

  const addToCart = async (item: MenuItem) => {
    if (!cart) return;

    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cart.cart.id,
          menuItemId: item.id,
          quantity: 1,
          unitPrice: item.price,
        }),
      });

      if (!response.ok) throw new Error("Failed to add item to cart");

      await loadCart();
      toast({
        title: "Added to cart",
        description: `${item.name} added to your cart`,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const updateCartItemQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(itemId);
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

  const removeFromCart = async (itemId: string) => {
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove item");

      await loadCart();
      toast({
        title: "Removed from cart",
        description: "Item removed from your cart",
      });
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  const getCartItemQuantity = (itemId: string): number => {
    const cartItem = cart?.items.find(ci => ci.menuItemId === itemId);
    return cartItem?.quantity || 0;
  };

  const getCartItemId = (menuItemId: string): string | undefined => {
    return cart?.items.find(ci => ci.menuItemId === menuItemId)?.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading menu...</div>
      </div>
    );
  }

  if (menus.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">No menus available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Menu Selector */}
      {menus.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {menus.map((menu) => (
            <Button
              key={menu.menu.id}
              variant={selectedMenu?.menu.id === menu.menu.id ? "default" : "outline"}
              onClick={() => setSelectedMenu(menu)}
              className="whitespace-nowrap"
            >
              {menu.menu.name}
            </Button>
          ))}
        </div>
      )}

      {/* Menu Content */}
      {selectedMenu && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{selectedMenu.menu.name}</h2>
            {selectedMenu.menu.description && (
              <p className="text-slate-400">{selectedMenu.menu.description}</p>
            )}
          </div>

          {/* Categories and Items */}
          {selectedMenu.categories.length > 0 ? (
            selectedMenu.categories.map((category) => {
              const categoryItems = selectedMenu.items.filter(
                (item) => item.categoryId === category.id && item.isAvailable
              );

              if (categoryItems.length === 0) return null;

              return (
                <div key={category.id} className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-slate-400">{category.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryItems.map((item) => {
                      const quantity = getCartItemQuantity(item.id);
                      const cartItemId = getCartItemId(item.id);

                      return (
                        <Card key={item.id} className="bg-slate-800 border-slate-700">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-white">{item.name}</CardTitle>
                                {item.description && (
                                  <CardDescription className="mt-1">{item.description}</CardDescription>
                                )}
                              </div>
                              <div className="text-lg font-bold text-green-400 ml-4">
                                ${parseFloat(item.price).toFixed(2)}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {/* Dietary Info */}
                              {item.dietaryInfo.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {item.dietaryInfo.map((info) => (
                                    <Badge key={info} variant="secondary" className="text-xs">
                                      {info}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Add to Cart / Quantity Controls */}
                              <div className="flex items-center justify-between">
                                {quantity === 0 ? (
                                  <Button
                                    onClick={() => addToCart(item)}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                  >
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    Add to Cart
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-3 w-full">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => cartItemId && updateCartItemQuantity(cartItemId, quantity - 1)}
                                      className="border-slate-600"
                                      disabled={!cartItemId}
                                    >
                                      <Minus className="w-4 h-4" />
                                    </Button>
                                    <span className="text-white font-medium min-w-[2rem] text-center">
                                      {quantity}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => cartItemId && updateCartItemQuantity(cartItemId, quantity + 1)}
                                      className="border-slate-600"
                                      disabled={!cartItemId}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            // No categories - show all items
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedMenu.items
                .filter((item) => item.isAvailable)
                .map((item) => {
                  const quantity = getCartItemQuantity(item.id);
                  const cartItemId = getCartItemId(item.id);

                  return (
                    <Card key={item.id} className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-white">{item.name}</CardTitle>
                            {item.description && (
                              <CardDescription className="mt-1">{item.description}</CardDescription>
                            )}
                          </div>
                          <div className="text-lg font-bold text-green-400 ml-4">
                            ${parseFloat(item.price).toFixed(2)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {quantity === 0 ? (
                          <Button
                            onClick={() => addToCart(item)}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                        ) : (
                          <div className="flex items-center gap-3 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cartItemId && updateCartItemQuantity(cartItemId, quantity - 1)}
                              className="border-slate-600"
                              disabled={!cartItemId}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="text-white font-medium min-w-[2rem] text-center">
                              {quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cartItemId && updateCartItemQuantity(cartItemId, quantity + 1)}
                              className="border-slate-600"
                              disabled={!cartItemId}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
