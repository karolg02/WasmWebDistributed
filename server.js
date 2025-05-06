const { Server } = require('socket.io');
const amqp = require('amqplib');
const http = require('http');
const { createTasks } = require('./create_tasks');

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*" }
});

//zadanie
let sum = 0;

//kolejka
const taskQueue = [];
let activeTasks = 0;

//workerzy
const workers = new Map();
let Sending = false;

//timery
let startTimer = null;

//klienci
let requestingClient = null;

async function broadcastWorkerList() {
    const list = Array.from(workers.entries()).map(([id, { name }]) => ({
        id,
        name
    }));
    io.of("/client").emit("worker_update", list);
}


async function start() {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    channel.assertQueue("tasks");

    //tu konsumuje z rabbitmq + pomiar
    channel.consume("tasks", (msg) => {
        const task = JSON.parse(msg.content.toString());
        taskQueue.push(task);
        channel.ack(msg);
    });

    //tu dzialanie workerow
    io.of("/worker").on("connection", (socket) => {
        console.log("Podlaczono workera: ", socket.id);

        socket.on("register", (data) => {
            const name = data.name || `Worker-${socket.id}`;
            workers.set(socket.id, { socket, name });
            broadcastWorkerList();
        })

        socket.on("disconnect", () => {
            console.log("Worker odlaczony", socket.id);
            workers.delete(socket.id);
            broadcastWorkerList();
        });

        socket.on("result", (data) => {
            sum += data.result;
            activeTasks--;
            console.log(`${socket.id}: ${data.result}: suma(${sum})`);

            if (taskQueue.length > 0 && Sending) {
                for (const id of activeClient.workerIds) {
                    const worker = workers.get(id)?.socket;
                    if (worker && taskQueue.length > 0) {
                        const task = taskQueue.shift();
                        task.clientId = activeClient.socket.id;
                        worker.emit("task", task);
                        activeTasks++;
                    }
                }
            } else if (taskQueue.length === 0 && Sending && activeTasks === 0) {
                //koniec roboty
                const durationSeconds = ((Date.now() - startTimer) / 1000).toFixed(2);
                Sending = false;

                activeClient.socket.emit("final_result", {
                    sum: parseFloat(sum.toFixed(6)),
                    duration: durationSeconds
                });

                sum = 0;
                startTimer = null;
                activeClient = null;
            }
        });
    })

    //tu dzialanie klientow
    io.of("/client").on("connection", (socket) => {
        console.log("Klient podlaczony", socket.id);
        broadcastWorkerList();

        socket.on("start", async ({ workerIds }) => {
            const selected = workerIds.filter(id => workers.has(id));
            if (selected.length === 0) {
                socket.emit("error", { msg: "Nie wybrano żadnej przeglądarki!" });
                return;
            }

            activeClient = {
                socket,
                workerIds: selected
            };

            await createTasks();

            if (startTimer === null) startTimer = Date.now();
            Sending = true;

            for (const id of selected) {
                const worker = workers.get(id)?.socket;
                if (worker && taskQueue.length > 0) {
                    const task = taskQueue.shift();
                    task.clientId = socket.id;
                    worker.emit("task", task);
                    activeTasks++;
                }
            }
        })
        socket.on("disconnect", () => {
            console.log("klient rozłączony:", socket.id);
        });
    });


    server.listen(8080, () => {
        console.log("Nasluchuje na porcie 8080");
    });
}

start();