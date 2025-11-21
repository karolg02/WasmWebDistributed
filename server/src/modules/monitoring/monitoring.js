/**
 * Monitoring Module
 * API endpoints for task monitoring and statistics
 */

const { db } = require('../common/db');
const { taskTracker } = require('../common/taskTracking');

/**
 * Get task history for a user
 */
function getUserTaskHistory(req, res) {
    const { email } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const sql = `
        SELECT 
            id, client_id, user_email, method, params, 
            total_tasks, status, worker_ids, 
            created_at, started_at, completed_at, duration, 
            result, error
        FROM tasks_history 
        WHERE user_email = ?
        ORDER BY created_at DESC
        LIMIT ?;
    `;

    db.all(sql, [email, limit], (err, rows) => {
        if (err) {
            console.error('[Monitoring] Error fetching task history:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const tasks = rows.map(row => ({
            ...row,
            params: JSON.parse(row.params),
            worker_ids: JSON.parse(row.worker_ids),
            result: row.result ? JSON.parse(row.result) : null
        }));

        res.json({ tasks });
    });
}

/**
 * Get detailed batch information for a task
 */
function getTaskBatches(req, res) {
    const { taskId } = req.params;

    const sql = `
        SELECT 
            id, task_history_id, worker_id, batch_index,
            tasks, status, assigned_at, completed_at, reassigned_from
        FROM task_batches 
        WHERE task_history_id = ?
        ORDER BY batch_index;
    `;

    db.all(sql, [taskId], (err, rows) => {
        if (err) {
            console.error('[Monitoring] Error fetching batches:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const batches = rows.map(row => ({
            ...row,
            tasks: JSON.parse(row.tasks)
        }));

        res.json({ batches });
    });
}

/**
 * Get current active tasks statistics
 */
function getActiveTasksStats(req, res) {
    const activeTasks = [];

    for (const [clientId, taskInfo] of taskTracker.activeTasks.entries()) {
        const stats = taskTracker.getTaskStats(clientId);
        activeTasks.push({
            clientId,
            ...stats,
            taskHistoryId: taskInfo.taskHistoryId
        });
    }

    res.json({ 
        activeTasksCount: activeTasks.length,
        activeTasks 
    });
}

/**
 * Get reassignment statistics
 */
function getReassignmentStats(req, res) {
    const sql = `
        SELECT 
            COUNT(*) as total_reassignments,
            COUNT(DISTINCT task_history_id) as affected_tasks,
            worker_id as new_worker,
            reassigned_from as old_worker
        FROM task_batches 
        WHERE reassigned_from IS NOT NULL
        GROUP BY new_worker, old_worker;
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('[Monitoring] Error fetching reassignment stats:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({ reassignments: rows });
    });
}

/**
 * Get overall system statistics
 */
function getSystemStats(req, res) {
    const stats = {
        activeTasks: taskTracker.activeTasks.size,
        activeWorkers: taskTracker.workerAssignments.size
    };

    // Query DB for historical stats
    const queries = [
        // Total tasks
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM tasks_history', [], (err, row) => {
                if (err) reject(err);
                else resolve({ totalTasks: row.count });
            });
        }),
        // Completed tasks
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM tasks_history WHERE status = 'completed'", [], (err, row) => {
                if (err) reject(err);
                else resolve({ completedTasks: row.count });
            });
        }),
        // Failed tasks
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM tasks_history WHERE status = 'failed'", [], (err, row) => {
                if (err) reject(err);
                else resolve({ failedTasks: row.count });
            });
        }),
        // Average duration
        new Promise((resolve, reject) => {
            db.get("SELECT AVG(duration) as avg FROM tasks_history WHERE duration IS NOT NULL", [], (err, row) => {
                if (err) reject(err);
                else resolve({ avgDuration: row.avg ? row.avg.toFixed(2) : 0 });
            });
        }),
        // Total reassignments
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM task_batches WHERE reassigned_from IS NOT NULL', [], (err, row) => {
                if (err) reject(err);
                else resolve({ totalReassignments: row.count });
            });
        })
    ];

    Promise.all(queries)
        .then(results => {
            results.forEach(result => Object.assign(stats, result));
            res.json({ stats });
        })
        .catch(err => {
            console.error('[Monitoring] Error fetching system stats:', err);
            res.status(500).json({ error: 'Database error' });
        });
}

module.exports = {
    getUserTaskHistory,
    getTaskBatches,
    getActiveTasksStats,
    getReassignmentStats,
    getSystemStats
};
