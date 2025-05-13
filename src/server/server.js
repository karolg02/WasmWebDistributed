const { Server } = require("socket.io");
const amqp = require("amqplib");
const http = require("http");
const { createTasks } = require("../../create_tasks");
const { io: ioClient } = require("socket.io-client");
const { createQueuePerClient } = require("./modules/queue");

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*" }
});

//polaczenie z resultManagerem
const resultManagerSocket = ioClient("http://localhost:8090/client");

resultManagerSocket.on("connect", () => {
    console.log("[Server] Connected to ResultManager!");
});

const workers = new Map();
const clientSockets = new Map();
const clientTasks = new Map();
const workerLocks = new Map();
const workerQueue = new Map();
const waitingClients = new Map();

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

    // Oblicz status dla wszystkich workerów
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
        benchmarkScore: workers.get(id)?.benchmarkScore
    }));

    const totalBenchmarkScore = benchmarks.reduce((sum, worker) => sum + worker.benchmarkScore, 0);

    const taskCountPerWorker = benchmarks.map(worker => ({
        id: worker.id,
        count: Math.floor((worker.benchmarkScore / totalBenchmarkScore) * tasks.length),
        batchSize: Math.max(50, Math.min(500, Math.floor(worker.benchmarkScore * 200)))
    }));

    let assigned = taskCountPerWorker.reduce((sum, worker) => sum + worker.count, 0);
    let remaining = tasks.length - assigned;
    for (let i = 0; remaining > 0 && i < taskCountPerWorker.length; i++) {
        taskCountPerWorker[i].count += 1;
        remaining--;
    }

    let i = 0;
    for (const { id, count, batchSize } of taskCountPerWorker) {
        const queueName = `tasks.worker_${id}`;
        for (let j = 0; j < count; j += batchSize) {
            const batch = [];
            for (let k = 0; k < batchSize && i < tasks.length; k++, i++) {
                const task = tasks[i];
                task.clientId = clientId;
                batch.push(task);
            }
            channel.sendToQueue(queueName, Buffer.from(JSON.stringify(batch)));
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

        //zglaszam klienta do resultManagera
        resultManagerSocket.emit("init_client", {
            clientId,
            expected: pending.tasks.length
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

                resultManagerSocket.emit("init_client", {
                    clientId,
                    expected: tasks.length
                });

                await tasksDevider3000(tasks, clientId, selected);
                broadcastQueueStatus();
            } else {
                // Worker zajęty - dodaj do kolejki
                waitingClients.set(clientId, { socket, workerIds: selected, tasks });

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

            waitingClients.delete(socket.id);
            for (const [wid, queue] of workerQueue.entries()) {
                workerQueue.set(wid, queue.filter(cid => cid !== socket.id));
            }
            broadcastQueueStatus(); // Dodaj tutaj
        });
    });

    //resultManager
    io.of("/resultManager").on("connection", (socket) => {
        const progressBuffer = new Map();
        const progressIntervals = new Map();

        socket.on("task_progress", ({ clientId, done }) => {
            const clientSocket = clientSockets.get(clientId);
            if (!clientSocket) return;

            const taskInfo = clientTasks.get(clientId);
            if (!taskInfo) return;

            // Aktualizuj bufor
            progressBuffer.set(clientId, { done });

            // Ustaw interwał jeśli jeszcze nie istnieje
            if (!progressIntervals.has(clientId)) {
                progressIntervals.set(clientId, setInterval(() => {
                    const progress = progressBuffer.get(clientId);
                    if (progress) {
                        clientSocket.emit("task_progress", progress);
                    }
                }, 1000));
            }
        });

        socket.on("final_result", ({ clientId, sum, duration }) => {
            const clientSocket = clientSockets.get(clientId);
            if (clientSocket) {
                // Wyczyść zasoby
                if (progressIntervals.has(clientId)) {
                    clearInterval(progressIntervals.get(clientId));
                    progressIntervals.delete(clientId);
                }
                progressBuffer.delete(clientId);

                // Wyślij wynik końcowy
                clientSocket.emit("final_result", { sum, duration });

                // Zwolnij workery
                const taskInfo = clientTasks.get(clientId);
                if (taskInfo) {
                    for (const wid of taskInfo.workerIds) {
                        if (workerLocks.get(wid) === clientId) {
                            workerLocks.delete(wid);
                        }
                    }
                    clientTasks.delete(clientId);
                }

                // Sprawdź czy są oczekujący klienci
                tryToGiveTasksForWaitingClients();
                broadcastQueueStatus(); // Dodaj tutaj
            }
        });

        socket.on("disconnect", () => {
            for (const [clientId, interval] of progressIntervals) {
                clearInterval(interval);
            }
            progressIntervals.clear();
            progressBuffer.clear();
        });
    });

    server.listen(8080, "0.0.0.0", () => {
        console.log("[Server] Listening on port 8080");
    });
}

start();
