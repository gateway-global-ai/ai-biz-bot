
import React from 'react';
import { MenuSection as MenuSectionType, MenuItem, InventoryType } from '../types';

interface Props {
  menu: MenuSectionType[];
  onAddToCart?: (item: MenuItem) => void;
  categoryType?: InventoryType;
}

const MenuSection: React.FC<Props> = ({ menu, onAddToCart, categoryType = 'menu' }) => {
  if (!menu || menu.length === 0) return null;

  const labels = {
    menu: { title: "Explore Our Menu", subtitle: "Signature Flavors", button: "Book a Table" },
    catalog: { title: "Product Catalog", subtitle: "Handpicked Selection", button: "Inquire Now" },
    services: { title: "Our Services", subtitle: "Expert Care", button: "Book Appointment" }
  };

  const { title, subtitle, button } = labels[categoryType] || labels.menu;

  return (
    <section className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-blue-600 font-bold tracking-widest text-xs uppercase mb-3 block">{subtitle}</span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900">{title}</h2>
          <div className="w-20 h-1.5 bg-blue-600 mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {menu.map((section, sIdx) => (
            <div key={sIdx} className="space-y-8">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{section.category}</h3>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              
              <div className="space-y-8">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx} className="group cursor-default relative">
                    <div className="flex justify-between items-baseline gap-4 mb-2">
                      <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</h4>
                      <div className="flex-1 border-b border-dashed border-slate-300"></div>
                      <span className="font-bold text-blue-600">{item.price}</span>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                        <p className="text-slate-500 text-sm leading-relaxed pr-10 italic">
                          {item.description}
                        </p>
                        {onAddToCart && (
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
    </section>
  );
};

export default MenuSection;
