import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Loader2, Store } from 'lucide-react';
import { motion } from 'framer-motion';

interface CategoryItem {
  slug: string;
  displayName: string;
  location: string;
}

export default function StorefrontsIndex() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/storefronts')
      .then((r) => r.ok ? r.json() : [])
      .then((data: CategoryItem[]) => { setCategories(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setCategories([]); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Industry Storefronts</h1>
        <p className="text-slate-400 mb-10">Choose a category to see industry insights and create your demo.</p>
        <div className="grid gap-4">
          {categories.length === 0 ? (
            <p className="text-slate-400">No categories yet.</p>
          ) : (
            categories.map((cat) => (
              <Link key={cat.slug} href={`/storefronts/${cat.slug}`}>
                <motion.div
                  className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="w-12 h-12 rounded-sui bg-indigo-500/20 flex items-center justify-center">
                    <Store className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{cat.displayName}</h2>
                    <p className="text-sm text-slate-400">{cat.location}</p>
                  </div>
                  <span className="ml-auto text-slate-400">→</span>
                </motion.div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
