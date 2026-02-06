import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  ListTodo, Plus, Trash2, Check, Circle, Calendar as CalendarIcon,
  Loader2, RefreshCw, AlertCircle, Link2
} from 'lucide-react';

interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: string;
}

const BUSINESS_ID = 'default';

function formatDueDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export default function GoogleTasksPage() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [newTask, setNewTask] = useState({ title: '', notes: '', dueDate: '' });

  const connectionQuery = useQuery<{ connected: boolean }>({
    queryKey: [`/api/google/connection/${BUSINESS_ID}`],
  });

  const tasksQuery = useQuery<{ success: boolean; data: { tasks: GoogleTask[] } }>({
    queryKey: ['/api/google/tasks', BUSINESS_ID],
    queryFn: async () => {
      const res = await fetch(`/api/google/tasks/${BUSINESS_ID}?maxResults=100`);
      if (!res.ok) throw new Error('Failed to load tasks');
      return res.json();
    },
    enabled: connectionQuery.data?.connected === true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTask) => {
      const body: any = { title: data.title };
      if (data.notes) body.notes = data.notes;
      if (data.dueDate) body.dueDate = new Date(data.dueDate).toISOString();
      return apiRequest('POST', `/api/google/tasks/${BUSINESS_ID}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google/tasks', BUSINESS_ID] });
      setShowCreate(false);
      setNewTask({ title: '', notes: '', dueDate: '' });
      toast({ title: 'Task created' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to create task', description: err.message, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      return apiRequest('PATCH', `/api/google/tasks/${BUSINESS_ID}/${taskId}`, {
        status: completed ? 'completed' : 'needsAction',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google/tasks', BUSINESS_ID] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update task', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest('DELETE', `/api/google/tasks/${BUSINESS_ID}/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google/tasks', BUSINESS_ID] });
      toast({ title: 'Task deleted' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to delete task', description: err.message, variant: 'destructive' });
    },
  });

  const handleConnect = async () => {
    try {
      const res = await fetch(`/api/google/auth-url?businessId=${BUSINESS_ID}`);
      const data = await res.json();
      if (data.authUrl) window.location.href = data.authUrl;
    } catch {
      toast({ title: 'Connection failed', variant: 'destructive' });
    }
  };

  const isConnected = connectionQuery.data?.connected === true;
  const allTasks = tasksQuery.data?.data?.tasks || [];
  const activeTasks = allTasks.filter(t => t.status !== 'completed');
  const completedTasks = allTasks.filter(t => t.status === 'completed');

  const displayedTasks = filter === 'active' ? activeTasks
    : filter === 'completed' ? completedTasks
    : allTasks;

  if (connectionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-20">
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ListTodo className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2" data-testid="text-tasks-connect-title">Connect Google Tasks</h2>
              <p className="text-slate-400 text-sm">
                Connect your Google account to view, create, and manage tasks directly from this dashboard.
              </p>
            </div>
            <Button onClick={handleConnect} className="bg-emerald-600" data-testid="button-connect-google-tasks">
              <Link2 className="w-4 h-4 mr-2" />
              Connect Google Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ListTodo className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white" data-testid="text-tasks-title">Google Tasks</h1>
          <Badge className="bg-slate-700 text-slate-300">{activeTasks.length} active</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/google/tasks', BUSINESS_ID] })}
            data-testid="button-refresh-tasks"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} data-testid="button-new-task">
            <Plus className="w-4 h-4 mr-1" /> New Task
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <Button
            key={f}
            variant="ghost"
            size="sm"
            className={`toggle-elevate ${filter === f ? 'toggle-elevated' : ''}`}
            onClick={() => setFilter(f)}
            data-testid={`button-filter-${f}`}
          >
            {f === 'all' ? `All (${allTasks.length})` : f === 'active' ? `Active (${activeTasks.length})` : `Done (${completedTasks.length})`}
          </Button>
        ))}
      </div>

      {showCreate && (
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-medium text-white">Create New Task</h3>
            <Input
              value={newTask.title}
              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Task title"
              className="bg-slate-800 border-slate-600"
              onKeyDown={(e) => e.key === 'Enter' && newTask.title && createMutation.mutate(newTask)}
              autoFocus
              data-testid="input-task-title"
            />
            <Textarea
              value={newTask.notes}
              onChange={(e) => setNewTask(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes (optional)"
              className="bg-slate-800 border-slate-600 resize-none"
              rows={2}
              data-testid="input-task-notes"
            />
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Due date (optional)</label>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                className="bg-slate-800 border-slate-600 w-48"
                data-testid="input-task-due"
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => newTask.title && createMutation.mutate(newTask)}
                disabled={!newTask.title || createMutation.isPending}
                data-testid="button-create-task"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Create Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tasksQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      ) : tasksQuery.isError ? (
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-slate-400">Failed to load tasks</p>
            <Button variant="outline" size="sm" onClick={() => tasksQuery.refetch()} data-testid="button-retry-tasks">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : displayedTasks.length === 0 ? (
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-12 text-center space-y-3">
            <ListTodo className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">
              {filter === 'all' ? 'No tasks yet' : filter === 'active' ? 'No active tasks' : 'No completed tasks'}
            </p>
            {filter !== 'completed' && (
              <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-empty-new-task">
                <Plus className="w-4 h-4 mr-1" /> Create a Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayedTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const overdue = !isCompleted && isOverdue(task.due);
            const dueLabel = formatDueDate(task.due);

            return (
              <Card key={task.id} className="bg-slate-900/60 border-slate-700" data-testid={`task-card-${task.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleMutation.mutate({ taskId: task.id, completed: !isCompleted })}
                      className="mt-0.5 flex-shrink-0"
                      data-testid={`button-toggle-task-${task.id}`}
                    >
                      {isCompleted ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 hover:text-emerald-400 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isCompleted ? 'text-slate-500 line-through' : 'text-white'}`}>
                        {task.title}
                      </p>
                      {task.notes && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.notes}</p>
                      )}
                      {dueLabel && (
                        <span className={`inline-flex items-center gap-1 text-xs mt-1.5 ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
                          <CalendarIcon className="w-3 h-3" />
                          {dueLabel}
                          {overdue && <span className="text-red-400 font-medium">overdue</span>}
                        </span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="flex-shrink-0"
                      onClick={() => {
                        if (confirm(`Delete "${task.title}"?`)) {
                          deleteMutation.mutate(task.id);
                        }
                      }}
                      data-testid={`button-delete-task-${task.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
