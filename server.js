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

let channel = null;
let connection = null;

async function broadcastWorkerList() {
    const list = Array.from(workers.entries()).map(([id, { name }]) => ({
        id,
        name
    }));
    io.of("/client").emit("worker_update", list);
}

// konusment z rabbitmq dla danego workera
async function createPerWorkerConsumer(workerId, socket) {
    const queueName = `tasks.worker_${workerId}`;
    await channel.assertQueue(queueName);

    channel.consume(queueName, (msg) => {
        const task = JSON.parse(msg.content.toString());
        socket.emit("task", task);
        channel.ack(msg);
    });
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
            broadcastWorkerList();
        });

        socket.on("result", (data) => {
            const { clientId, result } = data;
            const client = clientTasks.get(clientId);

            if (client.completed === 0) {
                client.start = Date.now();
            }

            client.sum += result;
            client.completed++;

            client.socket.emit("task_progress", {
                done: client.completed,
                total: client.expected
            });

            if (client.completed === client.expected) {
                const durationSeconds = ((Date.now() - client.start) / 1000).toFixed(2);
                client.socket.emit("final_result", {
                    sum: parseFloat(client.sum.toFixed(6)),
                    duration: durationSeconds
                });

                clientTasks.delete(clientId);
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
            const clientId = socket.id;

            clientTasks.set(clientId, {
                socket,
                workerIds: selected,
                expected: tasks.length,
                completed: 0,
                sum: 0,
                start: 0
            });

            // Round-robin: rozdziel zadania do kolejek per-worker
            let i = 0;
            for (const task of tasks) {
                const workerId = selected[i % selected.length];
                const queueName = `tasks.worker_${workerId}`;
                task.clientId = clientId;
                await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(task)));
                i++;
            }
        });

        socket.on("disconnect", () => {
            console.log("Klient rozłączony:", socket.id);
            clientSockets.delete(socket.id);
            clientTasks.delete(socket.id);
        });
    });

    server.listen(8080, () => {
        console.log("Nasłuchuję na porcie 8080");
    });
}

start();
