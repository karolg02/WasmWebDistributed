function registerWorkerNamespace(io, channel, workers, createQueuePerWorker, broadcastWorkerList, clientStates, clientSockets, getClientResult, activeCustomFunctions, tempDir, clientTasks, workerLocks, tryToGiveTasksForWaitingClients, waitingClients, workerQueue, tasksDevider3000, broadcastWorkerQueueList) {
    const PROGRESS_INTERVAL_MS = 1000;
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
                    }
                });

                await createQueuePerWorker(channel, socket.id, socket);
                broadcastWorkerList(io, workers);
            });

            socket.on("batch_result", async (data) => {
                const { clientId, results, result, tasksCount, method } = data;
                const state = clientStates.get(clientId);

                if (!state) return;

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
                    try {
                        const rawResult = await getClientResult(clientId, state.results, activeCustomFunctions, tempDir);
                        const clientSocket = clientSockets.get(clientId);
                        const now = Date.now();
                        const duration = state.start ? (now - state.start) / 1000 : null; // licz czas tuż przed wysłaniem!
                        if (clientSocket) {
                            clientSocket.emit("final_result", {
                                result: rawResult,
                                duration // <-- przekazuj duration
                            });
                        }
                    } catch (error) {
                        const fallbackSum = state.results.reduce((sum, val) => sum + val, 0);
                        const clientSocket = clientSockets.get(clientId);
                        if (clientSocket) {
                            clientSocket.emit("final_result", {
                                result: `Błąd getResult! Suma: ${fallbackSum}`,
                                duration: ((now - state.start) / 1000).toFixed(2),
                                resultsCount: state.results.length,
                                error: "getResult failed, using sum instead"
                            });
                        }
                    }
                    const taskInfo = clientTasks.get(clientId);
                    if (taskInfo) {
                        for (const wid of taskInfo.workerIds) {
                            if (workerLocks.get(wid) === clientId) {
                                workerLocks.delete(wid);
                            }
                        }
                        clientTasks.delete(clientId);
                    }

                    clientStates.delete(clientId);
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

            socket.on("disconnect", () => {
                console.log("[Worker] Disconnected", socket.id);
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