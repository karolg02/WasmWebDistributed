const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

let sum = 0;

wss.on("connection", (ws) => {
    console.log("Połączono przez WebSocket");

    const sendTask = () => {
        const task = {
            type: "task",
            taskId: "task_" + Date.now(),
            a: Math.floor(Math.random() * 10),
            b: Math.floor(Math.random() * 10)
        };
        ws.send(JSON.stringify(task));
    }

    sendTask();

    ws.on("message", (message) => {
        console.log("Otrzymano: ", message.toString());
        const data = JSON.parse(message.toString());
        if (data.type === "result") {
            sum += data.result;
        }
        console.log("Globalna suma wynosi: " + sum);
        if (sum < 1000000) sendTask();
    });

    ws.on("close", () => {
        console.log("Zamknieto");
    });
});