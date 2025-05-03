const WebSocket = require("ws");
const amqp = require('amqplib');

const wss = new WebSocket.Server({ port: 8080 });

let sum = 0;
const taskQueue = [];

//timers
let startTimer = null;
let endTimer = null;

async function start() {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    channel.assertQueue("tasks");

    channel.consume("tasks", (msg) => {
        const task = JSON.parse(msg.content.toString());
        taskQueue.push(task);
        if (startTimer === null) {
            startTimer = Date.now();
        }
    });

    wss.on("connection", async (ws) => {
        console.log("Połączono przez WebSocket");

        const sendTask = async () => {
            if (taskQueue.length > 0) {
                const task = taskQueue.shift();
                ws.send(JSON.stringify(task));
            }
        }

        await sendTask();

        ws.on("message", async (message) => {
            console.log("Otrzymano: ", message.toString());
            const data = JSON.parse(message.toString());
            if (data.type === "result") {
                sum += data.result;
            }
            console.log("Globalna suma wynosi: " + sum);
            //sending another task until etc
            if (taskQueue.length > 0) sendTask();
            else {
                endTimer = Date.now();
                const durationSeconds = ((endTimer - startTimer) / 1000).toFixed(2);
                console.log(`Czas obliczen ${durationSeconds}`);
            }
        });

        ws.on("close", () => {
            console.log("Zamknieto");
        });
    });
}

start();