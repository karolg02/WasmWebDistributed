const { createTasks } = require("../../createTasks");
const { sanitizeJsIdentifier, verifyToken } = require("../../utils/utils");
const { deleteClientFiles } = require("../../utils/deleteClientFiles");

function registerClientNamespace(io, channel, workers, broadcastWorkerList, clientStates, clientSockets, activeCustomFunctions, tempDir, clientTasks, workerLocks, tryToGiveTasksForWaitingClients, waitingClients, workerQueue, tasksDevider3000, broadcastWorkerQueueList) {
    io.of("/client").on("connection", (socket) => {
            const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
            if (!token) {
                socket.emit("unauthorized", { reason: "no_token" });
                console.log("[Client] No token provided - disconnecting", socket.id);
                return socket.disconnect(true);
            }
            const decoded = verifyToken(token);
            if (!decoded) {
                socket.emit(
                    "unauthorized",
                    { reason: "invalid_token" }
                    );
                console.log("[Client] Invalid token - disconnecting", socket.id);
                return socket.disconnect(true);
            }

            socket.user = decoded;

            console.log("[Client] Connected", socket.id, "user:", decoded.username || decoded.id);
            clientSockets.set(socket.id, socket);

            try {
                const initialList = Array.from(workers.entries()).map(([id, info]) => ({
                    id,
                    status: info.status || 'idle',
                    metadata: info.metadata || {}
                }));
                socket.emit('worker_list', initialList);
            } catch (err) {
                console.error('[Client] error sending initial worker_list', err);
            }

            socket.on("start", async ({ workerIds, taskParams }) => {
                const clientId = socket.id;
                const selected = workerIds.filter(id => workers.has(id));
                const tasks = await createTasks(taskParams);
                const allAvailable = selected.every(id => !workerLocks.has(id));

                if (allAvailable) {
                    for (const id of selected) {
                        workerLocks.set(id, clientId);
                    }

                    clientTasks.set(clientId, {
                        socket,
                        workerIds: selected
                    });

                    clientStates.set(clientId, {
                        expected: tasks.length,
                        completed: 0,
                        results: [],
                        start: 0,
                        lastUpdate: 0,
                        method: taskParams.method,
                        totalSamples: null,
                        selectedWorkerIds: selected
                    });

                    io.of("/worker").emit("custom_wasm_available", { 
                        clientId, 
                        sanitizedId: taskParams.id,
                        targetWorkerIds: selected
                    });

                    await tasksDevider3000(tasks, clientId, selected, taskParams, workers, channel);
                    broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);
                } else {
                    waitingClients.set(clientId, {
                        socket,
                        workerIds: selected,
                        tasks,
                        taskParams
                    });

                    for (const id of selected) {
                        if (!workerQueue.has(id)) {
                            workerQueue.set(id, []);
                        }
                        const queue = workerQueue.get(id);
                        if (!queue.includes(clientId)) {
                            queue.push(clientId);
                        }
                    }
                    broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);
                }
            });

            socket.on("request_worker_list", () => {
                broadcastWorkerList(io, workers);
                broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);
            });

            socket.on("disconnect", () => {
                console.log("[Client] Disconnected", socket.id);
                clientSockets.delete(socket.id);

                const taskInfo = clientTasks.get(socket.id);
                if (taskInfo) {
                    for (const wid of taskInfo.workerIds) {
                        if (workerLocks.get(wid) === socket.id) {
                            workerLocks.delete(wid);
                        }
                    }
                    clientTasks.delete(socket.id);
                }

                const clientState = clientStates.get(socket.id);
                clientStates.delete(socket.id);
                waitingClients.delete(socket.id);

                for (const [wid, queue] of workerQueue.entries()) {
                    workerQueue.set(wid, queue.filter(cid => cid !== socket.id));
                }
                broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);

                if (activeCustomFunctions.has(socket.id)) {
                    deleteClientFiles(socket.id, tempDir);
                    activeCustomFunctions.delete(socket.id);
                    
                    const targetWorkerIds = clientState?.selectedWorkerIds || [];
                    io.of("/worker").emit("unload_custom_wasm", { 
                        clientId: socket.id, 
                        sanitizedId: sanitizeJsIdentifier(socket.id),
                        targetWorkerIds: targetWorkerIds
                    });
                }
            });
        });
}

module.exports = { registerClientNamespace };