const { Server } = require("socket.io");
const { io: ioClient } = require("socket.io-client");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*" }
});

const mainServer = ioClient("http://localhost:8080/resultManager");

const clientStates = new Map();

// Połączenie z głównym serwerem
io.of("/worker").on("connection", (socket) => {
    socket.on("ping_resultSocket", () => {
        socket.emit("pong_resultSocket");
    });

    socket.on("batch_result", (data) => {
        const { clientId, result, tasksCount, method } = data;
        const state = clientStates.get(clientId);

        if (!state) return;

        if (state.completed === 0) {
            state.start = Date.now();
            state.method = method;

            if (method === 'montecarlo') {
                state.a = data.a;
                state.b = data.b;
                state.y_max = data.y_max;
            }
        }

        state.sum += result;
        state.completed += tasksCount;

        // Wysyłamy progress co sekundę
        const now = Date.now();
        if (now - state.lastUpdate >= 1000 || state.completed === state.expected) {
            mainServer.emit("task_progress", {
                clientId,
                done: state.completed,
                elapsedTime: Math.max(0, (now - state.start) / 1000)
            });
            state.lastUpdate = now;
        }

        if (state.completed === state.expected) {
            let finalResult = state.sum;
            if (state.method === 'montecarlo') {
                const area = (state.b - state.a) * state.y_max;
                finalResult = (state.sum / state.totalSamples) * area;
            }

            mainServer.emit("final_result", {
                clientId,
                sum: parseFloat(finalResult.toFixed(6)),
                duration: ((now - state.start) / 1000).toFixed(2)
            });
            clientStates.delete(clientId);
        }
    });
});

io.of("/client").on("connection", (socket) => {
    console.log("[ResultManager] Succesfully connected to main server!");

    socket.on("init_client", ({ clientId, expected, method, totalSamples }) => {
        clientStates.set(clientId, {
            expected,
            completed: 0,
            sum: 0,
            start: 0,
            lastUpdate: 0,
            method: method,
            totalSamples: totalSamples
        });
    });
});

server.listen(8090, () => {
    console.log("[ResultManager] Listening on port 8090");
});
