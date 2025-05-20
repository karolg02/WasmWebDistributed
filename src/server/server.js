const { Server } = require("socket.io");
const amqp = require("amqplib");
const http = require("http");
const { createTasks } = require("../../create_tasks");
const { createQueuePerClient } = require("./modules/queue");
const fs = require('fs');
const path = require('path');
const { compileTrapezIntegration, compileMonteCarlo, cleanupClientFiles } = require('./modules/compiler-service'); // Import compileMonteCarlo

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*" }
});

const workers = new Map();
const clientSockets = new Map();
const clientTasks = new Map();
const workerLocks = new Map();
const workerQueue = new Map();
const waitingClients = new Map();
const clientStates = new Map();
const activeCustomFunctions = new Map();

let channel = null;
let connection = null;

const tempDir = path.join(__dirname, '../worker/temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

async function broadcastWorkerList() {
    const list = Array.from(workers.entries()).map(([id, worker]) => ({
        id,
        name: worker.name,
        specs: {
            platform: worker.specs.platform,
            userAgent: worker.specs.userAgent,
            language: worker.specs.language,
            hardwareConcurrency: worker.specs.hardwareConcurrency,
            deviceMemory: worker.specs.deviceMemory
        },
        performance: {
            benchmarkScore: worker.performance.benchmarkScore,
            latency: worker.performance.latency
        }
    }));
    io.of("/client").emit("worker_update", list);
}

async function broadcastQueueStatus() {
    const queueStatus = {};
    for (const [workerId] of workers.entries()) {
        const currentClient = workerLocks.get(workerId);
        const queue = workerQueue.get(workerId) || [];

        queueStatus[workerId] = {
            workerId,
            queueLength: queue.length,
            currentClient: currentClient || null,
            isAvailable: !currentClient
        };
    }

    io.of("/client").emit("queue_status", queueStatus);
}

async function tasksDevider3000(tasks, clientId, selectedWorkerIds, originalTaskParams) {
    const benchmarks = selectedWorkerIds.map(id => ({
        id,
        benchmarkScore: workers.get(id)?.performance?.benchmarkScore || 0.1
    }));
    const totalBenchmarkScore = benchmarks.reduce((sum, worker) => sum + worker.benchmarkScore, 0);

    const taskCountPerWorker = benchmarks.map(worker => ({
        id: worker.id,
        count: Math.floor((worker.benchmarkScore / totalBenchmarkScore) * tasks.length),
        batchSize: Math.max(50, Math.min(1000, Math.round(((workers.get(worker.id)?.performance?.benchmarkScore || 0.1) * 100) / 50) * 50))
    }));
    let assigned = taskCountPerWorker.reduce((sum, worker) => sum + worker.count, 0);
    let remaining = tasks.length - assigned;

    if (remaining > 0) {
        const workersByScore = [...taskCountPerWorker]
            .sort((a, b) => (b.benchmarkScore || 0) - (a.benchmarkScore || 0));

        for (let i = 0; remaining > 0; i = (i + 1) % workersByScore.length) {
            workersByScore[i].count += 1;
            remaining--;
        }
    }

    let taskIndex = 0;
    const workerTasks = new Map();

    for (const { id, count } of taskCountPerWorker) {
        if (!workerTasks.has(id)) {
            workerTasks.set(id, []);
        }

        const workerTaskList = workerTasks.get(id);
        for (let j = 0; j < count && taskIndex < tasks.length; j++) {
            const task = tasks[taskIndex];
            task.clientId = clientId;
            task.useCustomFunction = true;
            task.sanitizedId = originalTaskParams.sanitizedId;
            workerTaskList.push(task);
            taskIndex++;
        }
    }

    for (const { id, batchSize } of taskCountPerWorker) {
        const queueName = `tasks.worker_${id}`;
        const workerTaskList = workerTasks.get(id) || [];

        for (let i = 0; i < workerTaskList.length; i += batchSize) {
            const batch = workerTaskList.slice(i, i + batchSize);
            if (batch.length > 0) {
                channel.sendToQueue(queueName, Buffer.from(JSON.stringify(batch)));
            }
        }
    }
}

async function tryToGiveTasksForWaitingClients() {
    for (const [clientId, pending] of waitingClients.entries()) {
        const allFree = pending.workerIds.every(id => !workerLocks.has(id));
        if (!allFree) continue;

        for (const id of pending.workerIds) {
            workerLocks.set(id, clientId);
            const q = workerQueue.get(id);
            if (q && q[0] === clientId) q.shift();
        }

        waitingClients.delete(clientId);

        clientTasks.set(clientId, {
            socket: pending.socket,
            workerIds: pending.workerIds
        });
        clientStates.set(clientId, {
            expected: pending.tasks.length,
            completed: 0,
            sum: 0,
            start: 0,
            lastUpdate: 0,
            method: pending.taskParams.method,
            totalSamples: pending.taskParams.method === 'montecarlo' ? pending.taskParams.samples : null // Corrected: use samples for Monte Carlo
        });
        await tasksDevider3000(pending.tasks, clientId, pending.workerIds, pending.taskParams);
    }
}

async function start() {
    connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();

    //workerzy
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

            await createQueuePerClient(channel, socket.id, socket);
            broadcastWorkerList();
        });
        socket.on("batch_result", (data) => {
            const { clientId, result, tasksCount, method } = data;
            const state = clientStates.get(clientId);

            if (!state) return;

            if (state.completed === 0) {
                state.start = Date.now();
                state.method = method;

                if (method === 'montecarlo') {
                    state.a = data.a;
                    state.b = data.b;
                }
            }

            state.sum += result;
            state.completed += tasksCount;
            const now = Date.now();
            if (now - state.lastUpdate >= 1000 || state.completed === state.expected) {
                const clientSocket = clientSockets.get(clientId);
                if (clientSocket) {
                    clientSocket.emit("task_progress", {
                        done: state.completed,
                        elapsedTime: Math.max(0, (now - state.start) / 1000)
                    });
                }
                state.lastUpdate = now;
            }
            if (state.completed === state.expected) {
                let finalResult = state.sum;
                if (state.method === 'montecarlo') {
                    if (state.totalSamples && state.totalSamples > 0 && typeof state.a === 'number' && typeof state.b === 'number') {
                        finalResult = (state.b - state.a) * (state.sum / state.totalSamples);
                    } else {
                        finalResult = NaN;
                    }
                }

                const clientSocket = clientSockets.get(clientId);
                if (clientSocket) {
                    clientSocket.emit("final_result", {
                        sum: parseFloat(finalResult.toFixed(6)),
                        duration: ((now - state.start) / 1000).toFixed(2)
                    });
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
                tryToGiveTasksForWaitingClients();
                broadcastQueueStatus();
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
            broadcastWorkerList();
        });
    });

    //klienci
    io.of("/client").on("connection", (socket) => {
        console.log("[Client] Connected", socket.id);
        clientSockets.set(socket.id, socket);
        broadcastWorkerList();

        socket.on("submit_custom_function", async (data) => {
            const { functionCode, method } = data;
            const clientId = socket.id;

            //console.log(`[Client] ${clientId} submitted custom function for method: ${method}`);

            let result;
            //tu logika tego co kompilujemy
            if (method === 'montecarlo') {
                result = await compileMonteCarlo(clientId, functionCode, tempDir);
            } else if (method === 'trapezoidal') {
                result = await compileTrapezIntegration(clientId, functionCode, tempDir);
            } else {
                socket.emit("custom_function_result", {
                    success: false,
                    error: "Invalid method specified for custom function compilation."
                });
                return;
            }

            if (result.success) {
                activeCustomFunctions.set(clientId, {
                    active: true,
                    sanitizedId: result.sanitizedId
                });

                io.of("/worker").emit("custom_wasm_available", {
                    clientId,
                    sanitizedId: result.sanitizedId,
                    timestamp: Date.now()
                });

                socket.emit("custom_function_result", {
                    success: true,
                    message: "Function compiled successfully",
                    sanitizedId: result.sanitizedId
                });
            } else {
                socket.emit("custom_function_result", {
                    success: false,
                    error: result.error
                });
            }
        });

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
                    sum: 0,
                    start: 0,
                    lastUpdate: 0,
                    method: taskParams.method,
                    totalSamples: taskParams.method === 'montecarlo' ? taskParams.samples : null // Corrected: use samples for Monte Carlo
                });

                await tasksDevider3000(tasks, clientId, selected, taskParams);
                broadcastQueueStatus();
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
                broadcastQueueStatus();
            }
        });

        socket.on("request_worker_list", () => {
            broadcastWorkerList();
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

            clientStates.delete(socket.id);
            waitingClients.delete(socket.id);

            for (const [wid, queue] of workerQueue.entries()) {
                workerQueue.set(wid, queue.filter(cid => cid !== socket.id));
            }
            broadcastQueueStatus();

            if (activeCustomFunctions.has(socket.id)) {
                cleanupClientFiles(socket.id, tempDir);
                activeCustomFunctions.delete(socket.id);
                io.of("/worker").emit("unload_custom_wasm", { clientId: socket.id });
            }
        });
    });

    server.listen(8080, "0.0.0.0", () => {
        console.log("[Server] Listening on port 8080");
    });
}

start();