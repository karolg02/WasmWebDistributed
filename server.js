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
const workers = new Set();
let Sending = false;

//timery
let startTimer = null;
let endTimer = null;

//klienci
let requestingClient = null;

async function broadcastWorkerList() {
    const allIds = Array.from(workers)
        .filter(w => w && typeof w.id === "string")
        .map(w => w.id);
    io.of("/client").emit("worker_update", allIds);
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
        workers.add(socket);
        broadcastWorkerList();

        socket.on("disconnect", () => {
            console.log("Worker odlaczony", socket.id);
            workers.delete(socket);
            broadcastWorkerList();
        });

        socket.on("result", (data) => {
            sum += data.result;
            activeTasks--;
            console.log(`${socket.id}: ${data.result}: suma(${sum})`);

            if (taskQueue.length > 0 && Sending) {
                for (const worker of workers) {
                    if (taskQueue.length > 0) {
                        const task = taskQueue.shift();
                        worker.emit("task", task);
                        activeTasks++;
                    }
                }
            } else if (taskQueue.length === 0 && Sending && activeTasks === 0) {
                //koniec roboty
                endTimer = Date.now();
                const durationSeconds = ((endTimer - startTimer) / 1000).toFixed(2);
                console.log(`Czas obliczeń: ${durationSeconds} sekund`);
                Sending = false;

                const finalSum = sum;
                sum = 0;
                startTimer = null;

                if (requestingClient) {
                    requestingClient.emit("final_result", {
                        sum: finalSum,
                        duration: durationSeconds
                    });
                }
            }
        });
    })

    //tu dzialanie klientow
    io.of("/client").on("connection", (socket) => {
        console.log("Klient podlaczony", socket.id);

        broadcastWorkerList();

        socket.on("start", async () => {
            console.log("zaczynam obliczac zadanie!");
            requestingClient = socket;

            await createTasks();

            if (startTimer === null) {
                startTimer = Date.now();
            }
            Sending = true;
            for (const worker of workers) {
                if (taskQueue.length > 0) {
                    const task = taskQueue.shift();
                    worker.emit("task", task);
                    activeTasks++;
                }
            }
        })
        socket.on("disconnect", () => {
            console.log("klient rozłączony:", socket.id);
        });
    })


    server.listen(8080, () => {
        console.log("Nasluchuje na porcie 8080");
    });
}

start();