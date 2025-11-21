const { db } = require('../common/db');
const { taskTracker } = require('../common/taskTracking');

const CHECK_INTERVAL = 60 * 60 * 1000;

function startScheduler() {
    console.log('[Scheduler] Starting task cleanup scheduler (interval: 60 minutes)');
    runTaskCleanup();
    
    setInterval(runTaskCleanup, CHECK_INTERVAL);
}

async function runTaskCleanup() {
    console.log('[Scheduler] Running task cleanup check...');
    
    try {
        await checkOrphanedTasks();
        
        console.log('[Scheduler] Task cleanup completed');
    } catch (error) {
        console.error('[Scheduler] Error during task cleanup:', error);
    }
}

async function checkOrphanedTasks() {
    const sql = `
        SELECT id, client_id, user_email, method, created_at
        FROM tasks_history
        WHERE status IN ('pending', 'running')
        AND id NOT IN (
            SELECT DISTINCT task_history_id 
            FROM task_batches 
            WHERE status IN ('pending', 'processing')
        )
    `;
    
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('[Scheduler] Error checking orphaned tasks:', err);
                reject(err);
                return;
            }
            
            if (rows.length > 0) {
                console.log(`[Scheduler] Found ${rows.length} orphaned tasks (no active batches)`);
                
                // Oznacz jako failed
                rows.forEach(task => {
                    const duration = (Date.now() - task.created_at) / 1000;
                    markTaskAsFailed(task.id, task.client_id, 'No workers available to process task', duration);
                });
            }
            
            resolve(rows.length);
        });
    });
}

function markTaskAsFailed(taskId, clientId, errorMessage, duration) {
    const now = Date.now();
    
    const sql = `
        UPDATE tasks_history 
        SET status = 'failed',
            completed_at = ?,
            duration = ?,
            error = ?
        WHERE id = ?
    `;
    
    db.run(sql, [now, duration, errorMessage, taskId], (err) => {
        if (err) {
            console.error(`[Scheduler] Error marking task ${taskId} as failed:`, err);
        } else {
            console.log(`[Scheduler] Marked task ${taskId} (client: ${clientId}) as failed: ${errorMessage}`);
            
            // Usuń z trackera jeśli istnieje
            if (taskTracker.activeTasks.has(clientId)) {
                taskTracker.activeTasks.delete(clientId);
                console.log(`[Scheduler] Removed task from tracker: ${clientId}`);
            }
        }
    });
}

function getSchedulerStats() {
    return {
        checkInterval: CHECK_INTERVAL,
        lastRun: new Date().toISOString()
    };
}

module.exports = {
    startScheduler,
    runTaskCleanup,
    getSchedulerStats
};
