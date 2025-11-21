/**
 * Task Reassignment Module
 * Obsługuje redistrybucję zadań gdy worker się odłączy
 */

const { taskTracker } = require('../common/taskTracking');
const { reassignTaskBatch } = require('../common/db');
const { db } = require('../common/db');

/**
 * Główna funkcja reassignment przy odłączeniu workera
 */
async function handleWorkerDisconnect(
    disconnectedWorkerId,
    workers,
    channel,
    workerLocks,
    clientTasks
) {
    console.log(`[TaskReassignment] Handling disconnect of worker ${disconnectedWorkerId}`);

    // Znajdź wszystkich klientów których dotyczy to odłączenie
    const affectedClients = taskTracker.getAffectedClients(disconnectedWorkerId);

    if (affectedClients.length === 0) {
        console.log(`[TaskReassignment] No affected clients for worker ${disconnectedWorkerId}`);
        return { reassignedCount: 0, affectedClients: [] };
    }

    console.log(`[TaskReassignment] Found ${affectedClients.length} affected clients`);

    let totalReassignedBatches = 0;
    const results = [];

    for (const clientId of affectedClients) {
        try {
            // Pobierz taskParams z clientTasks jeśli dostępne
            const taskInfo = clientTasks.get(clientId);
            const taskParams = taskInfo?.taskParams || null;

            const result = await reassignClientTasks(
                clientId,
                disconnectedWorkerId,
                workers,
                channel,
                workerLocks,
                clientTasks,
                taskParams
            );

            results.push(result);
            totalReassignedBatches += result.reassignedBatches;
        } catch (error) {
            console.error(`[TaskReassignment] Error reassigning tasks for client ${clientId}:`, error);
            results.push({
                clientId,
                success: false,
                error: error.message
            });
        }
    }

    console.log(`[TaskReassignment] Total reassigned batches: ${totalReassignedBatches}`);

    return {
        reassignedCount: totalReassignedBatches,
        affectedClients: results
    };
}

/**
 * Reassignuje taski dla konkretnego klienta
 */
async function reassignClientTasks(
    clientId,
    disconnectedWorkerId,
    workers,
    channel,
    workerLocks,
    clientTasks,
    taskParams
) {
    console.log(`[TaskReassignment] Processing client ${clientId}`);

    // Pobierz nieukończone batche dla tego workera
    const pendingBatches = taskTracker.getPendingBatchesForWorker(clientId, disconnectedWorkerId);

    if (pendingBatches.length === 0) {
        console.log(`[TaskReassignment] No pending batches for client ${clientId}`);
        return {
            clientId,
            success: true,
            reassignedBatches: 0,
            message: 'No pending batches'
        };
    }

    console.log(`[TaskReassignment] Found ${pendingBatches.length} pending batches for client ${clientId}`);

    // Znajdź dostępnych workerów (wykluczając rozłączonego)
    const availableWorkers = findAvailableWorkers(clientId, workers, workerLocks, disconnectedWorkerId);

    if (availableWorkers.length === 0) {
        console.warn(`[TaskReassignment] No available workers to reassign tasks for client ${clientId}`);
        
        // Oznacz zadanie jako failed w bazie danych
        markTaskAsFailed(clientId, 'No workers available after disconnect');
        
        // Usuń z trackera
        taskTracker.activeTasks.delete(clientId);
        
        return {
            clientId,
            success: false,
            reassignedBatches: 0,
            error: 'No available workers - task marked as failed'
        };
    }

    console.log(`[TaskReassignment] Found ${availableWorkers.length} available workers`);

    // Redistribute batches do dostępnych workerów
    let reassignedCount = 0;
    let workerIndex = 0;

    for (const pendingBatch of pendingBatches) {
        // Round-robin distribution
        const targetWorker = availableWorkers[workerIndex % availableWorkers.length];
        workerIndex++;

        try {
            // Rekonstruuj taski w formacie który oczekuje worker
            const tasksToSend = pendingBatch.tasks.map(t => {
                const task = {
                    taskId: t.taskId,
                    clientId,
                    useCustomFunction: true,
                    method: taskParams?.method || 'custom1D'
                };

                // Dodaj parametry w zależności od metody
                if (taskParams?.method === 'custom2D' && t.params.length >= 4) {
                    task.a = t.params[0];
                    task.b = t.params[1];
                    task.c = t.params[2];
                    task.d = t.params[3];
                    task.paramsArray = t.params;
                } else {
                    task.a = t.params[0];
                    task.b = t.params[1];
                    task.paramsArray = t.params;
                }

                if (taskParams?.id) {
                    task.sanitizedId = taskParams.id;
                }

                return task;
            });

            // Wyślij do kolejki workera
            const queueName = `tasks.worker_${targetWorker.id}`;
            const success = channel.sendToQueue(
                queueName,
                Buffer.from(JSON.stringify(tasksToSend)),
                { persistent: true }
            );

            if (success) {
                // Zaktualizuj tracking
                const oldBatchKey = `${disconnectedWorkerId}_${pendingBatch.batchIndex}`;
                taskTracker.reassignBatch(clientId, oldBatchKey, targetWorker.id);

                // Zaktualizuj DB
                if (pendingBatch.batchDbId) {
                    await reassignTaskBatch(pendingBatch.batchDbId, targetWorker.id);
                }

                // Zaktualizuj worker locks jeśli potrzeba
                if (!workerLocks.has(targetWorker.id)) {
                    workerLocks.set(targetWorker.id, clientId);
                }

                reassignedCount++;

                console.log(`[TaskReassignment] Reassigned batch ${oldBatchKey} -> ${targetWorker.id} (${tasksToSend.length} tasks)`);
            } else {
                console.error(`[TaskReassignment] Failed to send batch to queue ${queueName}`);
            }
        } catch (error) {
            console.error(`[TaskReassignment] Error reassigning batch:`, error);
        }
    }

    return {
        clientId,
        success: true,
        reassignedBatches: reassignedCount,
        totalPendingBatches: pendingBatches.length,
        targetWorkers: availableWorkers.map(w => w.id)
    };
}

/**
 * Znajduje dostępnych workerów do reassignment
 */
function findAvailableWorkers(clientId, workers, workerLocks, excludeWorkerId = null) {
    const available = [];

    for (const [workerId, worker] of workers.entries()) {
        // Pomiń wykluczony worker (np. rozłączony)
        if (excludeWorkerId && workerId === excludeWorkerId) {
            continue;
        }

        // Worker jest dostępny jeśli:
        // 1. Nie jest zablokowany ALBO
        // 2. Jest zablokowany przez tego samego klienta (może dostać więcej tasków)
        const lockedBy = workerLocks.get(workerId);
        
        if (!lockedBy || lockedBy === clientId) {
            available.push({
                id: workerId,
                score: worker.performance?.benchmarkScore || 1,
                isIdle: !lockedBy
            });
        }
    }

    // Sortuj: najpierw idle, potem po score
    available.sort((a, b) => {
        if (a.isIdle !== b.isIdle) return a.isIdle ? -1 : 1;
        return b.score - a.score; // wyższy score najpierw
    });

    return available;
}

/**
 * Sprawdza czy dany worker ma jakieś pending batches
 */
function hasWorkerPendingBatches(workerId) {
    const affectedClients = taskTracker.getAffectedClients(workerId);
    
    for (const clientId of affectedClients) {
        const pendingBatches = taskTracker.getPendingBatchesForWorker(clientId, workerId);
        if (pendingBatches.length > 0) {
            return true;
        }
    }
    
    return false;
}

/**
 * Oznacza zadanie jako failed w bazie danych
 */
function markTaskAsFailed(clientId, errorMessage) {
    const now = Date.now();
    
    // Pobierz task z trackera aby znaleźć ID w bazie
    const taskInfo = taskTracker.activeTasks.get(clientId);
    
    if (!taskInfo) {
        console.warn(`[TaskReassignment] No task info found for client ${clientId}`);
        return;
    }
    
    const sql = `
        UPDATE tasks_history 
        SET status = 'failed',
            completed_at = ?,
            error = ?
        WHERE client_id = ? AND status IN ('pending', 'running')
    `;
    
    db.run(sql, [now, errorMessage, clientId], function(err) {
        if (err) {
            console.error(`[TaskReassignment] Error marking task as failed for client ${clientId}:`, err);
        } else if (this.changes > 0) {
            console.log(`[TaskReassignment] Marked task for client ${clientId} as failed: ${errorMessage}`);
        }
    });
}

module.exports = {
    handleWorkerDisconnect,
    reassignClientTasks,
    findAvailableWorkers,
    hasWorkerPendingBatches,
    markTaskAsFailed
};
