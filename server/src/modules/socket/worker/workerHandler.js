const { taskTracker } = require('../../common/taskTracking');
const { handleWorkerDisconnect } = require('../../utils/taskReassignment');
const { updateTaskBatch, updateTaskHistory } = require('../../common/db');

function registerWorkerNamespace(io, channel, workers, createQueuePerWorker, broadcastWorkerList, clientStates, clientSockets, getClientResult, activeCustomFunctions, tempDir, clientTasks, workerLocks, tryToGiveTasksForWaitingClients, waitingClients, workerQueue, tasksDevider3000, broadcastWorkerQueueList) {
    const PROGRESS_INTERVAL_MS = 1000;
    const HEARTBEAT_TIMEOUT_MS = 15000; // 15 sekund bez heartbeat = timeout
    const HEARTBEAT_CHECK_INTERVAL_MS = 10000; // sprawdzaj co 10 sekund

    // Periodic heartbeat check
    const heartbeatChecker = setInterval(() => {
        const now = Date.now();
        const timedOutWorkers = [];

        for (const [workerId, worker] of workers.entries()) {
            if (worker.lastHeartbeat && (now - worker.lastHeartbeat) > HEARTBEAT_TIMEOUT_MS) {
                console.log(`[Worker] Heartbeat timeout for ${workerId}`);
                timedOutWorkers.push(workerId);
            }
        }

        // Disconnect timed out workers
        for (const workerId of timedOutWorkers) {
            const worker = workers.get(workerId);
            if (worker && worker.socket) {
                console.log(`[Worker] Force disconnecting ${workerId} due to heartbeat timeout`);
                worker.socket.disconnect(true);
            }
        }
    }, HEARTBEAT_CHECK_INTERVAL_MS);

    io.of("/worker").on("connection", async (socket) => {
            console.log("[Worker] Connected", socket.id);

            socket.on("register", async (workerInfo) => {
                const name = `${workerInfo?.system?.platform || 'Unknown'} (${workerInfo?.performance?.benchmarkScore?.toFixed(2) || '0.00'})`;

                workers.set(socket.id, {
                    socket,
                    name,
                    benchmarkScore: workerInfo?.performance?.benchmarkScore || 0,
                    specs: {
                        platform: workerInfo?.system?.platform || 'Unknown',
                        userAgent: workerInfo?.system?.userAgent || 'Unknown',
                        language: workerInfo?.system?.language || 'Unknown',
                        hardwareConcurrency: workerInfo?.system?.hardwareConcurrency || 0,
                        deviceMemory: workerInfo?.system?.deviceMemory || 'unknown'
                    },
                    performance: {
                        benchmarkScore: workerInfo?.performance?.benchmarkScore || 0,
                        latency: workerInfo?.performance?.latency || 0
                    },
                    lastHeartbeat: Date.now(),
                    status: 'active'
                });

                await createQueuePerWorker(channel, socket.id, socket);
                broadcastWorkerList(io, workers);
            });

            socket.on("heartbeat", (data) => {
                const worker = workers.get(socket.id);
                if (worker) {
                    worker.lastHeartbeat = Date.now();
                    worker.status = 'active';
                    
                    // Optional: store additional heartbeat data
                    if (data) {
                        worker.heartbeatData = {
                            activeTasksCount: data.activeTasksCount || 0,
                            memoryUsage: data.memoryUsage,
                            timestamp: data.timestamp
                        };
                    }
                }
            });

            socket.on("batch_result", async (data) => {
                const { clientId, results, result, tasksCount, method, completedTaskIds } = data;
                const state = clientStates.get(clientId);

                if (!state) {
                    console.warn(`[Worker] No state found for client ${clientId}`);
                    return;
                }

                // Track completed tasks in taskTracker
                if (completedTaskIds && Array.isArray(completedTaskIds)) {
                    taskTracker.markTasksCompleted(clientId, completedTaskIds);
                }

                if (state.completed === 0) {
                    state.method = method;
                    state.results = [];
                }

                if (Array.isArray(results) && results.length > 0) {
                    state.results.push(...results);
                } else if (result !== undefined && result !== null) {
                    state.results.push(result);
                }

                state.completed += tasksCount;

                const now = Date.now();
                if (now - state.lastUpdate >= PROGRESS_INTERVAL_MS || state.completed === state.expected) {
                    const clientSocket = clientSockets.get(clientId);
                    if (clientSocket) {
                        clientSocket.emit("task_progress", {
                            done: state.completed,
                            elapsedTime: Math.max(0, (now - state.start) / 1000),
                            total: state.expected
                        });
                    }
                    state.lastUpdate = now;
                }

                if (state.completed === state.expected) {
                    let rawResult;
                    let error = null;
                    const now = Date.now();
                    const duration = state.start ? (now - state.start) / 1000 : null;

                    try {
                        rawResult = await getClientResult(clientId, state.results, activeCustomFunctions, tempDir);
                        const clientSocket = clientSockets.get(clientId);
                        if (clientSocket) {
                            clientSocket.emit("final_result", {
                                result: rawResult,
                                duration
                            });
                        }
                    } catch (err) {
                        error = err.message;
                        const fallbackSum = state.results.reduce((sum, val) => sum + val, 0);
                        rawResult = `Błąd getResult! Suma: ${fallbackSum}`;
                        const clientSocket = clientSockets.get(clientId);
                        if (clientSocket) {
                            clientSocket.emit("final_result", {
                                result: rawResult,
                                duration: duration?.toFixed(2),
                                resultsCount: state.results.length,
                                error: "getResult failed, using sum instead"
                            });
                        }
                    }

                    // Update task history in DB
                    const taskInfo = clientTasks.get(clientId);
                    if (taskInfo && taskInfo.taskHistoryId) {
                        try {
                            await updateTaskHistory(taskInfo.taskHistoryId, {
                                status: error ? 'completed_with_errors' : 'completed',
                                completed_at: now,
                                duration: duration,
                                result: rawResult,
                                error: error
                            });
                        } catch (dbError) {
                            console.error('[Worker] Error updating task history:', dbError);
                        }
                    }

                    if (taskInfo) {
                        for (const wid of taskInfo.workerIds) {
                            if (workerLocks.get(wid) === clientId) {
                                workerLocks.delete(wid);
                            }
                        }
                        clientTasks.delete(clientId);
                    }

                    clientStates.delete(clientId);
                    
                    // Cleanup task tracking
                    taskTracker.cleanup(clientId);
                    
                    await tryToGiveTasksForWaitingClients(
                        waitingClients,
                        workerLocks,
                        workerQueue,
                        clientTasks,
                        clientStates,
                        workers,
                        channel,
                        tasksDevider3000
                    );
                    broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);
                }
            });

            socket.on("ping_resultSocket", () => {
                socket.emit("pong_resultSocket");
            });

            socket.on("disconnect", async () => {
                console.log("[Worker] Disconnected", socket.id);
                
                // Handle task reassignment przed usunięciem workera
                try {
                    const reassignmentResult = await handleWorkerDisconnect(
                        socket.id,
                        workers,
                        channel,
                        workerLocks,
                        clientTasks
                    );
                    
                    if (reassignmentResult.reassignedCount > 0) {
                        console.log(`[Worker] Reassigned ${reassignmentResult.reassignedCount} batches from ${socket.id}`);
                        broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);
                    }
                } catch (error) {
                    console.error(`[Worker] Error during task reassignment for ${socket.id}:`, error);
                }
                
                const queueName = `tasks.worker_${socket.id}`;
                channel.deleteQueue(queueName);
                workers.delete(socket.id);
                if (workerLocks.has(socket.id)) {
                    workerLocks.delete(socket.id);
                }
                broadcastWorkerList(io, workers);
            });
     }); 
}
module.exports = { registerWorkerNamespace };