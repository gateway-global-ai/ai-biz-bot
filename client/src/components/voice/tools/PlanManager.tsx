import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X, DollarSign, ChevronDown, ChevronRight, Package } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  isAvailable: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface Menu {
  id: string;
  name: string;
  categories: MenuCategory[];
}

interface PlanManagerProps {
  siteConfigId: string;
  onClose?: () => void;
  onTriggerSpeech?: (text: string) => void;
}

export const PlanManager: React.FC<PlanManagerProps> = ({ siteConfigId, onClose, onTriggerSpeech }) => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState<{ categoryId: string } | null>(null);

  // Fetch menus on mount
  useEffect(() => {
    fetchMenus();
  }, [siteConfigId]);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/menus/${siteConfigId}`);
      if (!res.ok) throw new Error('Failed to fetch menus');
      const menuList = await res.json();
      
      // For each menu, fetch details (categories and items)
      const fullMenus = await Promise.all(menuList.map(async (m: any) => {
        const detailRes = await fetch(`/api/menus/${siteConfigId}/${m.id}`);
        const details = await detailRes.json();
        
        // Organize items into categories
        const categories = details.categories.map((cat: any) => ({
          ...cat,
          items: details.items.filter((item: any) => item.categoryId === cat.id)
        }));
        
        return {
          ...m,
          categories
        };
      }));
      
      setMenus(fullMenus);
      if (fullMenus.length > 0 && !activeMenuId) {
        setActiveMenuId(fullMenus[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (item: Partial<MenuItem> & { categoryId: string, menuId: string }) => {
    try {
      const isNew = !item.id;
      const url = isNew ? '/api/menu-items' : `/api/menu-items/${item.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      
      if (!res.ok) throw new Error('Failed to save item');
      
      await fetchMenus();
      setEditingItem(null);
      setIsAddingItem(null);
      onTriggerSpeech?.(isNew ? "I've added that plan for you." : "I've updated that plan.");
    } catch (err) {
      console.error(err);
      onTriggerSpeech?.("I had trouble saving that change. Please try again.");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    
    try {
      await fetch(`/api/menu-items/${itemId}`, { method: 'DELETE' });
      await fetchMenus();
      onTriggerSpeech?.("I've removed that plan.");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading plans...</div>;
  }

  const activeMenu = menus.find(m => m.id === activeMenuId);

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
      <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Package className="text-indigo-600" size={20} />
          Plans & Pricing
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {menus.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>No plans configured yet.</p>
            <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
              Create First Menu
            </button>
          </div>
        ) : (
          <>
            {/* Menu Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {menus.map(menu => (
                <button
                  key={menu.id}
                  onClick={() => setActiveMenuId(menu.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeMenuId === menu.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {menu.name}
                </button>
              ))}
            </div>

            {/* Categories & Items */}
            <div className="space-y-6">
              {activeMenu?.categories.map(category => (
                <div key={category.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-bold text-slate-700">{category.name}</h4>
                    <button 
                      onClick={() => setIsAddingItem({ categoryId: category.id })}
                      className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  
                  <div className="divide-y divide-slate-100">
                    {category.items.map(item => (
                      <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                        {editingItem?.id === item.id ? (
                          <ItemEditor 
                            item={item} 
                            onSave={(updates) => handleSaveItem({ ...updates, categoryId: category.id, menuId: activeMenu.id })}
                            onCancel={() => setEditingItem(null)}
                          />
                        ) : (
                          <div className="flex justify-between items-start group">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{item.name}</span>
                                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  ${item.price}
                                </span>
                              </div>
                              <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingItem(item)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isAddingItem?.categoryId === category.id && (
                      <div className="p-4 bg-indigo-50/30">
                        <ItemEditor 
                          item={{ id: '', name: '', description: '', price: '', isAvailable: true }} 
                          onSave={(newItem) => handleSaveItem({ ...newItem, categoryId: category.id, menuId: activeMenu.id })}
                          onCancel={() => setIsAddingItem(null)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ItemEditor = ({ item, onSave, onCancel }: { item: MenuItem, onSave: (item: any) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState(item);

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Plan Name"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          autoFocus
        />
        <div className="relative w-32">
          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Price"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: e.target.value })}
            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
      <textarea
        placeholder="Description (optional)"
        value={formData.description}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 min-h-[60px]"
      />
      <div className="flex justify-end gap-2">
        <button 
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          Cancel
        </button>
        <button 
          onClick={() => onSave(formData)}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Save size={14} /> Save
        </button>
      </div>
    </div>
  );
};
