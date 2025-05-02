const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
    console.log("Połączono przez WebSocket");

    const task = {
        type: "task",
        taskId: "task001",
        a: 6,
        b: 5
    };

    ws.send(JSON.stringify(task));

    ws.on("message", (data) => {
        console.log("Otrzymano: ", data.toString());
    });

    ws.on("close", () => {
        console.log("Zamknieto");
    });
});