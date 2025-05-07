const { Server } = require("socket.io");
const amqp = require("amqplib");
const http = require("http");
const { createTasks } = require("./create_tasks");

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

let channel = null;
let connection = null;

async function broadcastWorkerList() {
    const list = Array.from(workers.entries()).map(([id, { name }]) => ({
        id,
        name
    }));
    io.of("/client").emit("worker_update", list);
}

async function createPerWorkerConsumer(workerId, socket) {
    const queueName = `tasks.worker_${workerId}`;
    await channel.assertQueue(queueName);

    channel.consume(queueName, (msg) => {
        const task = JSON.parse(msg.content.toString());
        socket.emit("task", task);
        channel.ack(msg);
    });
}

async function sendTasksInBatches(tasks, clientId, selectedWorkerIds, batchSize = 1000) {
    let i = 0;
    while (i < tasks.length) {
        const batch = tasks.slice(i, i + batchSize);
        let j = 0;
        for (const task of batch) {
            const workerId = selectedWorkerIds[j % selectedWorkerIds.length];
            const queueName = `tasks.worker_${workerId}`;
            task.clientId = clientId;
            channel.sendToQueue(queueName, Buffer.from(JSON.stringify(task)));
            j++;
        }
        i += batchSize;
        await new Promise(resolve => setImmediate(resolve));
    }
}

async function tryToGiveTasksForWaitingClients() {
    for (const [clientId, pending] of waitingClients.entries()) {
        const allFree = pending.workerIds.every(id => !workerLocks.has(id));
        if (!allFree) continue;

        // blokujemy workera
        for (const id of pending.workerIds) {
            workerLocks.set(id, clientId);
            const q = workerQueue.get(id);
            if (q && q[0] === clientId) q.shift(); // usuwanie z kolejki
        }

        waitingClients.delete(clientId);

        clientTasks.set(clientId, {
            socket: pending.socket,
            workerIds: pending.workerIds,
            expected: pending.tasks.length,
            completed: 0,
            sum: 0,
            start: 0
        });

        console.log(`Wystartowano oczekującego klienta ${clientId}`);
        await sendTasksInBatches(pending.tasks, clientId, pending.workerIds);
    }
}

async function start() {
    connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();

    // workerzy
    io.of("/worker").on("connection", async (socket) => {
        console.log("Połączono workera:", socket.id);

        socket.on("register", async (data) => {
            const name = data.name || `Worker-${socket.id}`;
            workers.set(socket.id, { socket, name });
            await createPerWorkerConsumer(socket.id, socket);
            broadcastWorkerList();
        });

        socket.on("disconnect", () => {
            console.log("Worker rozłączony:", socket.id);
            workers.delete(socket.id);

            if (workerLocks.has(socket.id)) {
                workerLocks.delete(socket.id);
            }

            broadcastWorkerList();
        });

        socket.on("result", async (data) => {
            const { clientId, result } = data;
            const client = clientTasks.get(clientId);
            if (!client) return;

            if (client.completed === 0) {
                client.start = Date.now();
            }

            client.sum += result;
            client.completed++;

            if (client.completed === client.expected) {
                const durationSeconds = ((Date.now() - client.start) / 1000).toFixed(2);
                client.socket.emit("final_result", {
                    sum: parseFloat(client.sum.toFixed(6)),
                    duration: durationSeconds
                });

                for (const wid of client.workerIds) {
                    if (workerLocks.get(wid) === clientId) {
                        workerLocks.delete(wid);
                    }
                }

                clientTasks.delete(clientId);

                await tryToGiveTasksForWaitingClients();
            }
        });
    });

    // klienci
    io.of("/client").on("connection", (socket) => {
        console.log("Klient podłączony:", socket.id);
        clientSockets.set(socket.id, socket);
        broadcastWorkerList();

        socket.on("start", async ({ workerIds }) => {
            const selected = workerIds.filter(id => workers.has(id));
            if (selected.length === 0) {
                socket.emit("error", { msg: "Nie wybrano żadnego workera!" });
                return;
            }

            const tasks = await createTasks();
            const allAvailable = selected.every(id => !workerLocks.has(id));
            const clientId = socket.id;

            if (allAvailable) {
                for (const id of selected) {
                    workerLocks.set(id, clientId);
                }

                clientTasks.set(clientId, {
                    socket,
                    workerIds: selected,
                    expected: tasks.length,
                    completed: 0,
                    sum: 0,
                    start: 0
                });

                console.log(`Rozpoczynam rozdzielanie ${tasks.length} zadań dla klienta ${clientId} na ${selected.length} workerów`);
                await sendTasksInBatches(tasks, clientId, selected);
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

                console.log(`Klient ${clientId} oczekuje na dostęp do workerów: ${selected.join(", ")}`);
            }
        });

        socket.on("disconnect", () => {
            console.log("Klient rozłączony:", socket.id);
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
            //jezeli czekal w kolejce to zwalniamy slota
            waitingClients.delete(socket.id);
            for (const [wid, queue] of workerQueue.entries()) {
                workerQueue.set(wid, queue.filter(cid => cid !== socket.id));
            }
        });
    });

    server.listen(8080, () => {
        console.log("Nasłuchuję na porcie 8080");
    });
}

start();
