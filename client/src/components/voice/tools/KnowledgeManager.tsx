import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Trash2, Eye, EyeOff, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import WebsitePlanUploader from '@/components/admin/WebsitePlanUploader';

interface KnowledgeArtifact {
  id: string;
  title: string;
  content: string | null;
  visibility: 'public' | 'private';
  scope: string;
  agentAccessKey: string;
  createdAt: string;
}

interface KnowledgeManagerProps {
  siteConfigId: string;
  onBack?: () => void;
}

type Tab = 'documents' | 'ingest';

export const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({ siteConfigId, onBack }) => {
  const [tab, setTab] = useState<Tab>('documents');
  const [items, setItems] = useState<KnowledgeArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('public');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadArtifacts = useCallback(() => {
    if (!siteConfigId) return;
    setLoading(true);
    fetch(`/api/knowledge/artifacts?siteConfigId=${encodeURIComponent(siteConfigId)}`, {
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText)))
      .then(data => {
        setItems(Array.isArray(data.items) ? data.items : []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [siteConfigId]);

  useEffect(() => { loadArtifacts(); }, [loadArtifacts]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/knowledge/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ siteConfigId, title: newTitle.trim(), content: newContent.trim(), visibility: newVisibility }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed to save');
      }
      setNewTitle('');
      setNewContent('');
      setNewVisibility('public');
      setShowAddForm(false);
      loadArtifacts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/knowledge/artifacts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
        )}
        <BookOpen size={16} className="text-indigo-400 shrink-0" />
        <span className="text-white font-semibold text-sm">Knowledge Library</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 shrink-0">
        {(['documents', 'ingest'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t
                ? 'text-indigo-300 border-b-2 border-indigo-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'documents' ? 'Documents' : 'Business Profile'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <AnimatePresence mode="wait">
          {tab === 'documents' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Add document button */}
              {!showAddForm && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-sui border border-dashed border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-colors"
                >
                  <Plus size={14} />
                  Add Document
                </button>
              )}

              {/* Add form */}
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 p-4 rounded-sui bg-slate-800/40 border border-indigo-500/20"
                >
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Document title"
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                  <textarea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Paste your document content here — services, FAQs, policies, pricing, hours, etc."
                    rows={5}
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Visibility:</span>
                    <button
                      type="button"
                      onClick={() => setNewVisibility(v => v === 'public' ? 'private' : 'public')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                        newVisibility === 'public'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {newVisibility === 'public' ? <Eye size={11} /> : <EyeOff size={11} />}
                      {newVisibility}
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => { setShowAddForm(false); setNewTitle(''); setNewContent(''); }}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={!newTitle.trim() || !newContent.trim() || saving}
                      className="px-3 py-1.5 rounded-lg text-xs bg-indigo-500 text-white disabled:opacity-40 hover:bg-indigo-400 transition-colors flex items-center gap-1.5"
                    >
                      {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                      Save
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs text-rose-400 px-1">{error}</p>
              )}

              {/* List */}
              {loading && (
                <div className="flex justify-center py-6">
                  <Loader2 size={18} className="text-indigo-400 animate-spin" />
                </div>
              )}
              {!loading && items.length === 0 && !showAddForm && (
                <p className="text-center text-slate-500 text-xs py-6">No documents yet. Add one above.</p>
              )}
              {!loading && items.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-start gap-3 p-3 rounded-sui bg-slate-800/40 border border-slate-700/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        item.visibility === 'public'
                          ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                          : 'bg-amber-500/15 border-amber-500/25 text-amber-400'
                      }`}>
                        {item.visibility}
                      </span>
                      <span className="text-slate-500 text-[10px] font-mono">{item.agentAccessKey}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                  >
                    {deletingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {tab === 'ingest' && (
            <motion.div
              key="ingest"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                Paste or upload a business plan, FAQ doc, or service guide. Gemini will extract structured knowledge that powers the agent's voice responses.
              </p>
              <WebsitePlanUploader
                siteConfigId={siteConfigId}
                onSuccess={() => {
                  // Refresh documents list after successful ingest
                  setTimeout(() => { setTab('documents'); loadArtifacts(); }, 1500);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
