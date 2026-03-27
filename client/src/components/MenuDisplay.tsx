import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MenuWithDetails, MenuItem } from "@/types/menu";
import { useToast } from "@/hooks/use-toast";

interface MenuDisplayProps {
  siteConfigId: string;
}

export default function MenuDisplay({ siteConfigId }: MenuDisplayProps) {
  const [menus, setMenus] = useState<MenuWithDetails[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMenus();
  }, [siteConfigId]);

  const loadMenus = async () => {
    try {
      const response = await fetch(`/api/menus/${siteConfigId}`);
      if (!response.ok) throw new Error("Failed to load menus");
      
      const menuList = await response.json();
      
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

      {selectedMenu && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{selectedMenu.menu.name}</h2>
            {selectedMenu.menu.description && (
              <p className="text-slate-400">{selectedMenu.menu.description}</p>
            )}
          </div>

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
                    {categoryItems.map((item) => (
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
                          {item.dietaryInfo.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {item.dietaryInfo.map((info) => (
                                <Badge key={info} variant="secondary" className="text-xs">
                                  {info}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedMenu.items
                .filter((item) => item.isAvailable)
                .map((item) => (
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
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
