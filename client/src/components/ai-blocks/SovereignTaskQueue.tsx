/**
 * SovereignTaskQueue — AI block wrapper
 *
 * Governed task queue display showing active orchestration runs,
 * pending tasks, and completed work items with status indicators.
 *
 * SDK reference: shadcn.io/ai/queue
 * Registry: gateway-sdk-manifest.yaml → ai-task-queue
 */

import { ListChecks, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ICON_SIZES } from '@/config/brand';

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  agentName?: string;
  startedAt?: number;
  completedAt?: number;
}

interface SovereignTaskQueueProps {
  tasks: TaskItem[];
  className?: string;
}

const STATUS_CONFIG: Record<TaskStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-slate-400', label: 'Pending' },
  running: { icon: Loader2, color: 'text-amber-500', label: 'Running' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Done' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  blocked: { icon: XCircle, color: 'text-orange-500', label: 'Blocked' },
};

export function SovereignTaskQueue({ tasks, className }: SovereignTaskQueueProps) {
  return (
    <div className={`flex flex-col h-full bg-white ${className ?? ''}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <ListChecks size={ICON_SIZES.canvasControl} className="text-emerald-500" />
        <span className="text-sm font-semibold text-slate-800">Task Queue</span>
        <span className="ml-auto text-[11px] text-slate-400 font-medium">
          {tasks.filter((t) => t.status === 'running').length} active
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {tasks.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-8">No tasks in queue</p>
        )}
        {tasks.map((task) => {
          const { icon: StatusIcon, color, label } = STATUS_CONFIG[task.status];
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <StatusIcon
                size={ICON_SIZES.canvasControl}
                className={`shrink-0 ${color} ${task.status === 'running' ? 'animate-spin' : ''}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 font-medium truncate">{task.title}</p>
                {task.agentName && (
                  <p className="text-[10px] text-slate-400">{task.agentName}</p>
                )}
              </div>
              <span className={`text-[10px] font-medium uppercase tracking-wider ${color}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
