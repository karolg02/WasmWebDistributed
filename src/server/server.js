const { Server } = require("socket.io");
const amqp = require("amqplib");
const http = require("http");
const { createTasks } = require("../../create_tasks");
const { createQueuePerClient } = require("./modules/queue");

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
const clientStates = new Map();  // Moved from resultManager.js

let channel = null;
let connection = null;

//do informowania klientow o polaczonych workerach
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

// do wyswietlania statusow
async function broadcastQueueStatus() {
    const queueStatus = {};

    // przetwarzamy statusy workerow
    for (const [workerId, worker] of workers.entries()) {
        const currentClient = workerLocks.get(workerId);
        const queue = workerQueue.get(workerId) || [];

        queueStatus[workerId] = {
            workerId,
            queueLength: queue.length,
            currentClient: currentClient || null,
            isAvailable: !currentClient // worker jest dostępny jeśli nie ma currentClient
        };
    }

    io.of("/client").emit("queue_status", queueStatus);
}

//lepszy podzial zadan
async function tasksDevider3000(tasks, clientId, selectedWorkerIds) {
    const benchmarks = selectedWorkerIds.map(id => ({
        id,
        benchmarkScore: workers.get(id)?.benchmarkScore || 0.1
    }));

    const totalBenchmarkScore = benchmarks.reduce((sum, worker) => sum + worker.benchmarkScore, 0);

    // Calculate how many tasks each worker should get
    const taskCountPerWorker = benchmarks.map(worker => ({
        id: worker.id,
        count: Math.floor((worker.benchmarkScore / totalBenchmarkScore) * tasks.length),
        // Round batchSize to nearest multiple of 50 for more consistent batches
        batchSize: Math.max(50, Math.min(1000, Math.round((worker.benchmarkScore * 200) / 50) * 50))
    }));

    console.log("Worker distribution:", taskCountPerWorker.map(w =>
        `${w.id.substring(0, 8)}: ${w.count} tasks, ${w.batchSize} batch size`
    ));

    // Distribute remaining tasks
    let assigned = taskCountPerWorker.reduce((sum, worker) => sum + worker.count, 0);
    let remaining = tasks.length - assigned;

    // Distribute remaining tasks more evenly based on benchmark score ratio
    if (remaining > 0) {
        const workersByScore = [...taskCountPerWorker]
            .sort((a, b) => (b.benchmarkScore || 0) - (a.benchmarkScore || 0));

        for (let i = 0; remaining > 0; i = (i + 1) % workersByScore.length) {
            workersByScore[i].count += 1;
            remaining--;
        }
    }

    // Allocate specific tasks to each worker first
    let taskIndex = 0;
    const workerTasks = new Map();

    // First, assign tasks to workers
    for (const { id, count } of taskCountPerWorker) {
        if (!workerTasks.has(id)) {
            workerTasks.set(id, []);
        }

        const workerTaskList = workerTasks.get(id);
        for (let j = 0; j < count && taskIndex < tasks.length; j++) {
            const task = tasks[taskIndex];
            task.clientId = clientId;
            workerTaskList.push(task);
            taskIndex++;
        }
    }

    // Log how many tasks each worker received
    for (const [id, taskList] of workerTasks.entries()) {
        console.log(`Worker ${id.substring(0, 8)} assigned ${taskList.length} tasks`);
    }

    // Then, send tasks in appropriate batches
    for (const { id, batchSize } of taskCountPerWorker) {
        const queueName = `tasks.worker_${id}`;
        const workerTaskList = workerTasks.get(id) || [];
        const batchCount = Math.ceil(workerTaskList.length / batchSize);

        console.log(`Sending ${workerTaskList.length} tasks to ${id.substring(0, 8)} in ${batchCount} batches of max ${batchSize} tasks`);

        for (let i = 0; i < workerTaskList.length; i += batchSize) {
            const batch = workerTaskList.slice(i, i + batchSize);
            if (batch.length > 0) {
                channel.sendToQueue(queueName, Buffer.from(JSON.stringify(batch)));
                console.log(`  Batch ${Math.floor(i / batchSize) + 1}/${batchCount}: ${batch.length} tasks`);
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

        // Initialize client state tracking
        clientStates.set(clientId, {
            expected: pending.tasks.length,
            completed: 0,
            sum: 0,
            start: 0,
            lastUpdate: 0,
            method: pending.tasks[0]?.method,
            totalSamples: pending.tasks[0]?.method === 'montecarlo' ?
                pending.taskParams?.samples : null
        });

        console.log(`Time for ${clientId} tasks`);
        await tasksDevider3000(pending.tasks, clientId, pending.workerIds);
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

        // Integration of batch_result handler from resultManager.js
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
                    state.y_max = data.y_max;
                }
            }

            state.sum += result;
            state.completed += tasksCount;

            // Send progress updates
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

            // If all tasks are completed, send the final result
            if (state.completed === state.expected) {
                let finalResult = state.sum;
                if (state.method === 'montecarlo') {
                    const area = (state.b - state.a) * state.y_max;
                    finalResult = (state.sum / state.totalSamples) * area;
                }

                const clientSocket = clientSockets.get(clientId);
                if (clientSocket) {
                    clientSocket.emit("final_result", {
                        sum: parseFloat(finalResult.toFixed(6)),
                        duration: ((now - state.start) / 1000).toFixed(2)
                    });
                }

                // Clean up resources
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

                // Check for waiting clients
                tryToGiveTasksForWaitingClients();
                broadcastQueueStatus();
            }
        });

        // Add ping/pong for latency measurement
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

        socket.on("start", async ({ workerIds, taskParams }) => {
            const selected = workerIds.filter(id => workers.has(id));
            const tasks = await createTasks(taskParams);
            const clientId = socket.id;

            const allAvailable = selected.every(id => !workerLocks.has(id));

            if (allAvailable) {
                for (const id of selected) {
                    workerLocks.set(id, clientId);
                }

                clientTasks.set(clientId, {
                    socket,
                    workerIds: selected
                });

                // Initialize client state tracking
                clientStates.set(clientId, {
                    expected: tasks.length,
                    completed: 0,
                    sum: 0,
                    start: 0,
                    lastUpdate: 0,
                    method: taskParams.method,
                    totalSamples: taskParams.method === 'montecarlo' ? taskParams.samples : null
                });

                await tasksDevider3000(tasks, clientId, selected);
                broadcastQueueStatus();
            } else {
                // worker zajety, dodaje do kolejki
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
        });
    });

    server.listen(8080, "0.0.0.0", () => {
        console.log("[Server] Listening on port 8080");
    });
}

start();
