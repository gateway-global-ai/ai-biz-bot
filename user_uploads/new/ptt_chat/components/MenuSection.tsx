import React, { useState } from 'react';
import { MenuSection as MenuSectionType, MenuItem, InventoryType } from '../types';

interface Props {
  menu: MenuSectionType[];
  onAddToCart?: (item: MenuItem) => void;
  onUpdateMenu?: (newMenu: MenuSectionType[]) => void;
  categoryType?: InventoryType;
  isAdmin?: boolean;
}

const EditItemModal = ({ 
  item, 
  categoryName, 
  onSave, 
  onDelete, 
  onClose 
}: { 
  item: MenuItem; 
  categoryName: string;
  onSave: (updated: MenuItem) => void;
  onDelete: () => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState<MenuItem>({ ...item });

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-sm flex justify-center p-4 animate-in fade-in duration-200">
      {/* 
          Modal docking: Positioned from the top with a max-height that ends well before the footer.
          The footer is roughly 18vh + some margin, so we cap this at 70vh to ensure visibility.
      */}
      <div className="bg-white w-full max-w-md mt-4 max-h-[70vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-top-10 duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Edit Item</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{categoryName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Item Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Price</label>
            <input 
              type="text" 
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-600 leading-relaxed h-32 resize-none"
            />
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button 
            onClick={onDelete}
            className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const MenuSection: React.FC<Props> = ({ menu, onAddToCart, onUpdateMenu, categoryType = 'menu', isAdmin = false }) => {
  const [editingItem, setEditingItem] = useState<{ item: MenuItem; categoryIdx: number; itemIdx: number } | null>(null);

  if (!menu || menu.length === 0) return null;

  const labels = {
    menu: { title: "Explore Our Menu", subtitle: "Signature Flavors", button: "Book a Table" },
    catalog: { title: "Product Catalog", subtitle: "Handpicked Selection", button: "Inquire Now" },
    services: { title: "Our Services", subtitle: "Expert Care", button: "Book Appointment" }
  };

  const { title, subtitle, button } = labels[categoryType] || labels.menu;

  const handleUpdateItem = (updated: MenuItem) => {
    if (!editingItem || !onUpdateMenu) return;
    const newMenu = [...menu];
    newMenu[editingItem.categoryIdx].items[editingItem.itemIdx] = updated;
    onUpdateMenu(newMenu);
    setEditingItem(null);
  };

  const handleDeleteItem = () => {
    if (!editingItem || !onUpdateMenu) return;
    const newMenu = [...menu];
    newMenu[editingItem.categoryIdx].items.splice(editingItem.itemIdx, 1);
    onUpdateMenu(newMenu);
    setEditingItem(null);
  };

  const handleUpdateCategory = (idx: number, newName: string) => {
    if (!onUpdateMenu) return;
    const newMenu = [...menu];
    newMenu[idx].category = newName;
    onUpdateMenu(newMenu);
  };

  return (
    <section className={`py-24 bg-white relative ${isAdmin ? 'pb-80' : ''}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-blue-600 font-bold tracking-widest text-xs uppercase mb-3 block">{subtitle}</span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900">{title}</h2>
          <div className="w-20 h-1.5 bg-blue-600 mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {menu.map((section, sIdx) => (
            <div key={sIdx} className="space-y-8">
              <div className="flex items-center gap-4 group/cat">
                {isAdmin ? (
                  <input 
                    type="text" 
                    value={section.category}
                    onChange={(e) => handleUpdateCategory(sIdx, e.target.value)}
                    className="text-2xl font-black text-slate-800 uppercase tracking-tight bg-transparent border-b border-dashed border-slate-200 focus:border-blue-500 focus:border-solid focus:outline-none pb-1 transition-all"
                  />
                ) : (
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{section.category}</h3>
                )}
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              
              <div className="space-y-8">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx} className="group cursor-default relative">
                    <div className="flex justify-between items-baseline gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button 
                            onClick={() => setEditingItem({ item, categoryIdx: sIdx, itemIdx: iIdx })}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                        )}
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</h4>
                      </div>
                      <div className="flex-1 border-b border-dashed border-slate-300"></div>
                      <span className="font-bold text-blue-600 whitespace-nowrap">{item.price}</span>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                        <p className="text-slate-500 text-sm leading-relaxed pr-10 italic">
                          {item.description}
                        </p>
                        {onAddToCart && !isAdmin && (
                          <button 
                            onClick={() => onAddToCart(item)}
                            className="bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add to Order
                          </button>
                        )}
                    </div>
                  </div>
                ))}
                
                {isAdmin && (
                  <button 
                    onClick={() => {
                      const newItem = { name: "New Item", description: "Freshly added item details...", price: "$0.00" };
                      const newMenu = [...menu];
                      newMenu[sIdx].items.push(newItem);
                      onUpdateMenu?.(newMenu);
                      setEditingItem({ item: newItem, categoryIdx: sIdx, itemIdx: newMenu[sIdx].items.length - 1 });
                    }}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add New Item to {section.category}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
            <button className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all">
                {button}
            </button>
        </div>
      </div>

      {editingItem && (
        <EditItemModal 
          item={editingItem.item}
          categoryName={menu[editingItem.categoryIdx].category}
          onSave={handleUpdateItem}
          onDelete={handleDeleteItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </section>
  );
};

export default MenuSection;