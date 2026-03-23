import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, Plus, Trash2, ChevronUp, ChevronDown, Loader2, ArrowLeft, Save } from 'lucide-react';

interface TaskItem {
  id: string;
  label: string;
  description?: string;
  required: boolean;
}

interface TaskOrderEditorProps {
  siteConfigId: string;
  onBack?: () => void;
}

function makeId() {
  return Math.random().toString(36).substring(2, 10);
}

export const TaskOrderEditor: React.FC<TaskOrderEditorProps> = ({ siteConfigId, onBack }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current task order from site config
  useEffect(() => {
    if (!siteConfigId) return;
    fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText)))
      .then(data => {
        setTasks(Array.isArray(data.taskOrder) ? data.taskOrder : []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [siteConfigId]);

  const updateTask = useCallback((id: string, patch: Partial<TaskItem>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const addTask = useCallback(() => {
    setTasks(prev => [...prev, { id: makeId(), label: '', description: '', required: false }]);
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setTasks(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setTasks(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleSave = async () => {
    const valid = tasks.filter(t => t.label.trim());
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}/task-order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tasks: valid }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed to save');
      }
      setTasks(valid);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
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
        <ListChecks size={16} className="text-indigo-400 shrink-0" />
        <span className="text-white font-semibold text-sm">Task Order</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sui text-xs font-medium transition-colors ${
            saved
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40'
          }`}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="text-indigo-400 animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Define the steps your agent works through in every conversation. Required tasks must be completed before the session ends.
            </p>

            {error && <p className="text-rose-400 text-xs mb-3">{error}</p>}

            <div className="space-y-2">
              <AnimatePresence>
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-sui bg-slate-800/40 border border-slate-700/50 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {/* Step number */}
                      <span className="text-xs font-mono text-slate-500 w-5 shrink-0 text-center">{index + 1}</span>

                      {/* Label */}
                      <input
                        type="text"
                        value={task.label}
                        onChange={e => updateTask(task.id, { label: e.target.value })}
                        placeholder="Task name…"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none border-b border-transparent focus:border-slate-600 pb-0.5 transition-colors"
                      />

                      {/* Required toggle */}
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, { required: !task.required })}
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                          task.required
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            : 'bg-slate-700/50 border-slate-600/50 text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        {task.required ? 'req' : 'opt'}
                      </button>

                      {/* Up/down/delete */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveUp(index)} disabled={index === 0}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
                          <ChevronUp size={12} />
                        </button>
                        <button type="button" onClick={() => moveDown(index)} disabled={index === tasks.length - 1}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
                          <ChevronDown size={12} />
                        </button>
                        <button type="button" onClick={() => removeTask(task.id)}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-rose-400 transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Description (optional) */}
                    <input
                      type="text"
                      value={task.description ?? ''}
                      onChange={e => updateTask(task.id, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className="w-full pl-7 bg-transparent text-xs text-slate-400 placeholder:text-slate-600 focus:outline-none"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              <button
                type="button"
                onClick={addTask}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-sui border border-dashed border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-colors mt-2"
              >
                <Plus size={14} />
                Add Task
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
