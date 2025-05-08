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

async function broadcastWorkerList() {
    const list = Array.from(workers.entries()).map(([id, { name }]) => ({
        id,
        name
    }));
    io.of("/client").emit("worker_update", list);
}
//lepszy podzial zadan
async function tasksDevider3000(tasks, clientId, selectedWorkerIds, batchSize = 100) {
    const benchmarks = selectedWorkerIds.map(id => ({
        id,
        benchmarkScore: workers.get(id)?.benchmarkScore
    }));

    const totalBenchmarkScore = benchmarks.reduce((sum, worker) => sum + worker.benchmarkScore, 0);

    const taskCountPerWorker = benchmarks.map(worker => ({
        id: worker.id,
        count: Math.floor((worker.benchmarkScore / totalBenchmarkScore) * tasks.length)
    }));

    let assigned = taskCountPerWorker.reduce((sum, worker) => sum + worker.count, 0);
    let remaining = tasks.length - assigned;
    for (let i = 0; remaining > 0 && i < taskCountPerWorker.length; i++) {
        taskCountPerWorker[i].count += 1;
        remaining--;
    }

    console.log(`[Task Divider] Client ${clientId} → Task distribution:`);

    for (const { id, count } of taskCountPerWorker) {
        const name = workers.get(id)?.name || id;
        console.log(`  - ${name} (ID: ${id}) gets ${count} tasks`);
    }

    let i = 0;
    for (const { id, count } of taskCountPerWorker) {
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

        socket.on("register", async (data) => {
            const name = data.name || `Worker-${socket.id}`;
            const benchmarkScore = data.benchmarkScore || 1;

            workers.set(socket.id, { socket, name, benchmarkScore });
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

        socket.on("start", async ({ workerIds }) => {
            const selected = workerIds.filter(id => workers.has(id));

            const tasks = await createTasks();
            const allAvailable = selected.every(id => !workerLocks.has(id));
            const clientId = socket.id;

            if (allAvailable) {
                for (const id of selected) {
                    workerLocks.set(id, clientId);
                }

                clientTasks.set(clientId, {
                    socket,
                    workerIds: selected
                });

                //rejestracja klienta do resultManagera
                resultManagerSocket.emit("init_client", {
                    clientId,
                    expected: tasks.length
                });

                //console.log(`Starting to separate ${tasks.length} tasks for client ${clientId}`);
                await tasksDevider3000(tasks, clientId, selected);
            } else {
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

                //console.log(`Client ${clientId} waits for: ${selected.join(", ")}`);
            }
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
        });
    });

    //resultManager
    io.of("/resultManager").on("connection", (socket) => {
        // socket.on("task_progress", ({ clientId, done, total }) => {
        //     const clientSocket = clientSockets.get(clientId);
        //     if (clientSocket) {
        //         clientSocket.emit("task_progress", { done, total });
        //     }
        // });

        socket.on("final_result", ({ clientId, sum, duration }) => {
            const clientSocket = clientSockets.get(clientId);
            if (clientSocket) {
                clientSocket.emit("final_result", { sum, duration });

                //brak zadan to przydzielam workera
                const info = clientTasks.get(clientId);
                if (info) {
                    for (const wid of info.workerIds) {
                        if (workerLocks.get(wid) === clientId) {
                            workerLocks.delete(wid);
                        }
                    }
                    clientTasks.delete(clientId);
                }

                tryToGiveTasksForWaitingClients();
            }
        });
    });

    server.listen(8080, () => {
        console.log("[Server] Listening on port 8080");
    });
}

start();
