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
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Get total count
    const countSql = 'SELECT COUNT(*) as total FROM tasks_history WHERE user_email = ?';
    
    db.get(countSql, [email], (err, countRow) => {
        if (err) {
            console.error('[Monitoring] Error counting tasks:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const total = countRow.total;
        const totalPages = Math.ceil(total / limit);

        // Get paginated tasks
        const sql = `
            SELECT 
                id, client_id, user_email, method, params, 
                total_tasks, status, worker_ids, 
                created_at, started_at, completed_at, duration, 
                result, error
            FROM tasks_history 
            WHERE user_email = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?;
        `;

        db.all(sql, [email, limit, offset], (err, rows) => {
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

            res.json({ 
                tasks,
                pagination: {
                    total,
                    totalPages,
                    currentPage: Math.floor(offset / limit) + 1,
                    pageSize: limit
                }
            });
        });
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
        // Pending tasks
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM tasks_history WHERE status = 'pending'", [], (err, row) => {
                if (err) reject(err);
                else resolve({ pendingTasks: row.count });
            });
        }),
        // Running tasks
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM tasks_history WHERE status = 'running'", [], (err, row) => {
                if (err) reject(err);
                else resolve({ runningTasks: row.count });
            });
        }),
        // Average duration
        new Promise((resolve, reject) => {
            db.get("SELECT AVG(duration) as avg FROM tasks_history WHERE duration IS NOT NULL", [], (err, row) => {
                if (err) reject(err);
                else resolve({ avgTaskDuration: row.avg ? parseFloat(row.avg.toFixed(2)) : 0 });
            });
        }),
        // Total reassignments
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM task_batches WHERE reassigned_from IS NOT NULL', [], (err, row) => {
                if (err) reject(err);
                else resolve({ totalReassignments: row.count });
            });
        }),
        // Tasks per method
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    method,
                    COUNT(*) as count
                FROM tasks_history
                GROUP BY method
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve({ tasksPerMethod: rows });
            });
        })
    ];

    Promise.all(queries)
        .then(results => {
            results.forEach(result => Object.assign(stats, result));
            res.json(stats);
        })
        .catch(err => {
            console.error('[Monitoring] Error fetching system stats:', err);
            res.status(500).json({ error: 'Database error' });
        });
}

/**
 * Get statistics for a specific user
 */
function getUserStats(req, res) {
    const { email } = req.params;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const queries = [
        // Total tasks count (submissions, not individual computations)
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM tasks_history WHERE user_email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve({ totalSubmissions: row.count });
            });
        }),
        // Completed tasks
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM tasks_history WHERE user_email = ? AND status = 'completed'", [email], (err, row) => {
                if (err) reject(err);
                else resolve({ completedTasks: row.count });
            });
        }),
        // Failed tasks
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM tasks_history WHERE user_email = ? AND status = 'failed'", [email], (err, row) => {
                if (err) reject(err);
                else resolve({ failedTasks: row.count });
            });
        }),
        // Pending tasks
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM tasks_history WHERE user_email = ? AND status = 'pending'", [email], (err, row) => {
                if (err) reject(err);
                else resolve({ pendingTasks: row.count });
            });
        }),
        // Running tasks
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM tasks_history WHERE user_email = ? AND status = 'running'", [email], (err, row) => {
                if (err) reject(err);
                else resolve({ runningTasks: row.count });
            });
        }),
        // Total computations (sum of total_tasks)
        new Promise((resolve, reject) => {
            db.get("SELECT SUM(total_tasks) as sum FROM tasks_history WHERE user_email = ?", [email], (err, row) => {
                if (err) reject(err);
                else resolve({ totalComputations: row.sum || 0 });
            });
        }),
        // Average duration
        new Promise((resolve, reject) => {
            db.get("SELECT AVG(duration) as avg FROM tasks_history WHERE user_email = ? AND duration IS NOT NULL", [email], (err, row) => {
                if (err) reject(err);
                else resolve({ avgTaskDuration: row.avg ? parseFloat(row.avg.toFixed(2)) : 0 });
            });
        }),
        // Tasks per method
        new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    method,
                    COUNT(*) as count
                FROM tasks_history
                WHERE user_email = ?
                GROUP BY method
            `, [email], (err, rows) => {
                if (err) reject(err);
                else resolve({ tasksPerMethod: rows });
            });
        })
    ];

    Promise.all(queries)
        .then(results => {
            const userStats = {};
            results.forEach(result => Object.assign(userStats, result));
            res.json(userStats);
        })
        .catch(err => {
            console.error('[Monitoring] Error fetching user stats:', err);
            res.status(500).json({ error: 'Database error' });
        });
}

module.exports = {
    getUserTaskHistory,
    getUserStats,
    getTaskBatches,
    getActiveTasksStats,
    getReassignmentStats,
    getSystemStats
};
