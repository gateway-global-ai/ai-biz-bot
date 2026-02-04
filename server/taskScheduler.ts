import { storage } from "./storage";
import { generateTaskUpdate } from "./kimi";
import { sendSms } from "./twilio";

// 24-Hour Task Update Schedule:
// - Start (0h): "Got your task, starting now" - sent immediately on submission
// - 1 hour: "Progress update"
// - 12 hours: "Halfway check-in"
// - 24 hours: "Task complete!"

// Determine update type based on updates already sent
function getUpdateTypeForCount(updatesCount: number): { updateType: 'progress' | 'midpoint' | 'complete', nextHoursFromNow: number | null } {
  // updatesCount = 1 means start was sent, next is progress (at 1h)
  // updatesCount = 2 means progress was sent, next is midpoint (at 12h from start, but we schedule relative)
  // updatesCount = 3 means midpoint was sent, next is complete (at 24h from start)
  // updatesCount >= 4 means complete was sent, no more updates
  
  switch (updatesCount) {
    case 1:
      return { updateType: 'progress', nextHoursFromNow: 11 }; // Next: midpoint in 11 hours
    case 2:
      return { updateType: 'midpoint', nextHoursFromNow: 12 }; // Next: complete in 12 hours
    case 3:
      return { updateType: 'complete', nextHoursFromNow: null }; // Done
    default:
      return { updateType: 'complete', nextHoursFromNow: null }; // Already complete
  }
}

async function processTaskUpdates(): Promise<void> {
  try {
    // Get tasks that need updates
    const pendingTasks = await storage.getTasksPendingUpdate();
    
    if (pendingTasks.length === 0) {
      return;
    }
    
    console.log(`[Task Scheduler] Processing ${pendingTasks.length} tasks`);
    
    // Get Twilio config
    const config = await storage.getTelephonyConfig();
    if (!config?.phoneNumber || !config?.accountSid || !config?.authToken) {
      console.warn('[Task Scheduler] No Twilio config, skipping updates');
      return;
    }
    
    for (const task of pendingTasks) {
      try {
        const startedAt = task.startedAt ? new Date(task.startedAt) : new Date(task.createdAt!);
        const hoursElapsed = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60);
        const currentUpdatesCount = task.updatesCount || 1;
        
        // Get update type based on how many updates have been sent
        const { updateType, nextHoursFromNow } = getUpdateTypeForCount(currentUpdatesCount);
        
        console.log(`[Task Scheduler] Task ${task.id}: ${hoursElapsed.toFixed(1)}h elapsed, update #${currentUpdatesCount + 1} (${updateType})`);
        
        // Generate update message using Kimi
        const smsMessage = await generateTaskUpdate({
          agentName: task.agentName,
          taskDescription: task.task,
          hoursElapsed: Math.round(hoursElapsed),
          totalHours: task.estimatedHours || 24,
          updateType,
        });
        
        // Send SMS
        await sendSms(task.userPhone, smsMessage, config.phoneNumber);
        console.log(`[Task Scheduler] Sent ${updateType} SMS to ${task.userPhone}`);
        
        // Update task with new count and next update time
        const newUpdatesCount = currentUpdatesCount + 1;
        const updates: any = {
          updatesCount: newUpdatesCount,
        };
        
        if (updateType === 'complete') {
          updates.status = 'completed';
          updates.completedAt = new Date();
          updates.nextUpdateAt = null;
        } else if (nextHoursFromNow !== null) {
          updates.status = 'in_progress';
          updates.nextUpdateAt = new Date(Date.now() + nextHoursFromNow * 60 * 60 * 1000);
        }
        
        await storage.updateTask(task.id, updates);
        
      } catch (taskError) {
        console.error(`[Task Scheduler] Error processing task ${task.id}:`, taskError);
      }
    }
    
  } catch (error) {
    console.error('[Task Scheduler] Error:', error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startTaskScheduler(intervalMinutes: number = 1): void {
  if (schedulerInterval) {
    console.log('[Task Scheduler] Already running');
    return;
  }
  
  console.log(`[Task Scheduler] Starting with ${intervalMinutes} minute interval`);
  
  // Run immediately on start
  processTaskUpdates();
  
  // Then run every interval
  schedulerInterval = setInterval(processTaskUpdates, intervalMinutes * 60 * 1000);
}

export function stopTaskScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Task Scheduler] Stopped');
  }
}

// Export for testing
export { processTaskUpdates };
