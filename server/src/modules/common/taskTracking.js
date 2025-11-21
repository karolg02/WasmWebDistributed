class TaskTracker {
    constructor() {
        this.activeTasks = new Map();
        this.workerAssignments = new Map();
    }

    initializeTask(clientId, taskHistoryId, totalTasks) {
        this.activeTasks.set(clientId, {
            taskHistoryId,
            totalTasks,
            batches: new Map(),
            completedTaskIds: new Set(),
            startTime: Date.now()
        });
    }

    registerBatch(clientId, workerId, batchIndex, tasks, batchDbId) {
        const taskInfo = this.activeTasks.get(clientId);
        if (!taskInfo) {
            console.warn(`[TaskTracker] No task info for client ${clientId}`);
            return;
        }

        const batchKey = `${workerId}_${batchIndex}`;
        taskInfo.batches.set(batchKey, {
            workerId,
            batchIndex,
            batchDbId,
            tasks: tasks.map(t => ({
                taskId: t.taskId,
                params: t.paramsArray || [t.a, t.b, t.c, t.d].filter(x => x !== undefined)
            })),
            status: 'pending',
            assignedAt: Date.now()
        });

        if (!this.workerAssignments.has(workerId)) {
            this.workerAssignments.set(workerId, new Set());
        }
        this.workerAssignments.get(workerId).add(clientId);
    }

    markTasksCompleted(clientId, completedTaskIds) {
        const taskInfo = this.activeTasks.get(clientId);
        if (!taskInfo) return;

        for (const taskId of completedTaskIds) {
            taskInfo.completedTaskIds.add(taskId);
        }

        for (const [batchKey, batch] of taskInfo.batches.entries()) {
            if (batch.status === 'pending') {
                const allCompleted = batch.tasks.every(t => 
                    taskInfo.completedTaskIds.has(t.taskId)
                );

                if (allCompleted) {
                    batch.status = 'completed';
                    batch.completedAt = Date.now();
                }
            }
        }
    }

    getPendingBatchesForWorker(clientId, workerId) {
        const taskInfo = this.activeTasks.get(clientId);
        if (!taskInfo) return [];

        const pendingBatches = [];

        for (const [batchKey, batch] of taskInfo.batches.entries()) {
            if (batch.workerId === workerId && batch.status === 'pending') {
                const incompleteTasks = batch.tasks.filter(t => 
                    !taskInfo.completedTaskIds.has(t.taskId)
                );

                if (incompleteTasks.length > 0) {
                    pendingBatches.push({
                        batchKey,
                        batchIndex: batch.batchIndex,
                        batchDbId: batch.batchDbId,
                        tasks: incompleteTasks,
                        originalTaskCount: batch.tasks.length
                    });
                }
            }
        }

        return pendingBatches;
    }

    getAffectedClients(workerId) {
        return Array.from(this.workerAssignments.get(workerId) || []);
    }

    reassignBatch(clientId, batchKey, newWorkerId) {
        const taskInfo = this.activeTasks.get(clientId);
        if (!taskInfo) return false;

        const batch = taskInfo.batches.get(batchKey);
        if (!batch) return false;

        const oldWorkerId = batch.workerId;
        batch.workerId = newWorkerId;
        batch.reassignedFrom = oldWorkerId;
        batch.reassignedAt = Date.now();

        const oldWorkerClients = this.workerAssignments.get(oldWorkerId);
        if (oldWorkerClients) {
            const hasOtherBatches = Array.from(taskInfo.batches.values())
                .some(b => b.workerId === oldWorkerId && b !== batch);
            
            if (!hasOtherBatches) {
                oldWorkerClients.delete(clientId);
            }
        }

        if (!this.workerAssignments.has(newWorkerId)) {
            this.workerAssignments.set(newWorkerId, new Set());
        }
        this.workerAssignments.get(newWorkerId).add(clientId);
        taskInfo.batches.delete(batchKey);
        const newBatchKey = `${newWorkerId}_${batch.batchIndex}`;
        taskInfo.batches.set(newBatchKey, batch);

        return true;
    }

    isTaskComplete(clientId) {
        const taskInfo = this.activeTasks.get(clientId);
        if (!taskInfo) return false;

        return taskInfo.completedTaskIds.size === taskInfo.totalTasks;
    }

    getTaskStats(clientId) {
        const taskInfo = this.activeTasks.get(clientId);
        if (!taskInfo) return null;

        const totalBatches = taskInfo.batches.size;
        const completedBatches = Array.from(taskInfo.batches.values())
            .filter(b => b.status === 'completed').length;

        return {
            totalTasks: taskInfo.totalTasks,
            completedTasks: taskInfo.completedTaskIds.size,
            progress: (taskInfo.completedTaskIds.size / taskInfo.totalTasks * 100).toFixed(2),
            totalBatches,
            completedBatches,
            elapsedTime: ((Date.now() - taskInfo.startTime) / 1000).toFixed(2)
        };
    }

    cleanup(clientId) {
        const taskInfo = this.activeTasks.get(clientId);
        if (!taskInfo) return;

        for (const [batchKey, batch] of taskInfo.batches.entries()) {
            const workerClients = this.workerAssignments.get(batch.workerId);
            if (workerClients) {
                workerClients.delete(clientId);
                if (workerClients.size === 0) {
                    this.workerAssignments.delete(batch.workerId);
                }
            }
        }

        this.activeTasks.delete(clientId);
    }

    debugPrintState() {
        console.log(`[TaskTracker] Active tasks: ${this.activeTasks.size}`);
        for (const [clientId, taskInfo] of this.activeTasks.entries()) {
            const stats = this.getTaskStats(clientId);
            console.log(`  Client ${clientId}: ${stats.completedTasks}/${stats.totalTasks} (${stats.progress}%)`);
        }
    }
}

const taskTracker = new TaskTracker();

module.exports = { taskTracker, TaskTracker };
