const { Server } = require("socket.io");
const { io: ioClient } = require("socket.io-client");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*" }
});

//polaczenie z glownym serwerem
const mainServer = ioClient("http://localhost:8080/resultManager");

const clientStates = new Map();

io.of("/worker").on("connection", (socket) => {
    socket.on("result", (data) => {
        const { clientId, result, duration } = data;

        const state = clientStates.get(clientId);

        if (state.completed === 0) {
            state.start = Date.now();
        }

        state.sum += result;
        state.completed++;

        // mainServer.emit("task_progress", {
        //     clientId,
        //     done: state.completed,
        //     total: state.expected
        // });

        if (state.completed === state.expected) {
            const durationSeconds = ((Date.now() - state.start) / 1000).toFixed(2);

            mainServer.emit("final_result", {
                clientId,
                sum: parseFloat(state.sum.toFixed(6)),
                duration: durationSeconds
            });

            clientStates.delete(clientId);
        }
    });
});

io.of("/client").on("connection", (socket) => {
    console.log("[ResultManager] Succesfully connected to main server!");

    socket.on("init_client", ({ clientId, expected }) => {
        clientStates.set(clientId, {
            expected,
            completed: 0,
            sum: 0,
            start: 0
        });
    });
});

server.listen(8090, () => {
    console.log("[ResultManager] Listening on port 8090");
});
