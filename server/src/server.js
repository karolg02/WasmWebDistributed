const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require('fs');
const path = require('path');

const { createTasks } = require("./modules/createTasks");
const { createQueuePerClient } = require("./modules/createQueuePerWorker");
const { connectToRabbitMQ } = require("./modules/rabbitmq/connectToRabbit");
const { sanitizeJsIdentifier } = require("./modules/utils/utils");
const { deleteClientFiles } = require("./modules/utils/deleteClientFiles");
const { getClientResult } = require("./modules/socket/client/clientResult");
const { broadcastWorkerList, broadcastWorkerQueueList } = require("./modules/socket/worker/broadcast");
const { tasksDevider3000 } = require("./modules/utils/tasksDivider3000");

const app = express();
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));


const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const workers = new Map();
const clientSockets = new Map();
const clientTasks = new Map();
const workerLocks = new Map();
const workerQueue = new Map();
const waitingClients = new Map();
const clientStates = new Map();
const activeCustomFunctions = new Map();


let channel = null;

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

app.use('/temp', express.static(tempDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `temp_${timestamp}_${file.fieldname}${ext}`);
    }
});

const upload = multer({ storage: storage });

app.post('/upload-wasm', upload.fields([
    { name: 'wasmFile', maxCount: 1 },
    { name: 'loaderFile', maxCount: 1 }
]), (req, res) => {
    try {
        const { clientId, method } = req.body;

        if (!clientId) {
            return res.json({
                success: false,
                error: "Brak clientId w żądaniu"
            });
        }

        const sanitizedId = sanitizeJsIdentifier(clientId);

        const wasmTempFile = req.files['wasmFile'][0];
        const loaderTempFile = req.files['loaderFile'][0];

        const wasmPath = path.join(tempDir, `${sanitizedId}.wasm`);
        const loaderPath = path.join(tempDir, `${sanitizedId}.js`);

        try {
            fs.renameSync(wasmTempFile.path, wasmPath);
            fs.renameSync(loaderTempFile.path, loaderPath);
        } catch (renameError) {
            return res.json({
                success: false,
                error: "Błąd podczas zapisywania plików"
            });
        }

        activeCustomFunctions.set(clientId, {
            active: true,
            sanitizedId: sanitizedId
        });

        io.of("/worker").emit("custom_wasm_available", {
            clientId,
            sanitizedId,
            timestamp: Date.now()
        });

        res.json({
            success: true,
            message: "Pliki przesłane pomyślnie",
            sanitizedId: sanitizedId
        });

    } catch (error) {
        res.json({
            success: false,
            error: "Błąd serwera podczas przetwarzania plików"
        });
    }
});

app.use('/temp', express.static(tempDir));

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
        clientStates.set(clientId, {
            expected: pending.tasks.length,
            completed: 0,
            results: [],
            start: 0,
            lastUpdate: 0,
            method: pending.taskParams.method,
            totalSamples: pending.taskParams.method === 'custom1D' || pending.taskParams.method === 'custom2D' ? null : pending.taskParams.samples
        });
        await tasksDevider3000(pending.tasks, clientId, pending.workerIds, pending.taskParams, workers, channel);
    }
}

async function start() {
    try {
        const { channel: ch } = await connectToRabbitMQ();
        channel = ch;
        
        //workerzy
        io.of("/worker").on("connection", async (socket) => {
            console.log("[Worker] Connected", socket.id);

            socket.on("register", async (workerInfo) => {
                const name = `${workerInfo?.system?.platform || 'Unknown'} (${workerInfo?.performance?.benchmarkScore?.toFixed(2) || '0.00'})`;

                workers.set(socket.id, {
                    socket,
                    name,
                    benchmarkScore: workerInfo?.performance?.benchmarkScore || 0,
                    specs: {
                        platform: workerInfo?.system?.platform || 'Unknown',
                        userAgent: workerInfo?.system?.userAgent || 'Unknown',
                        language: workerInfo?.system?.language || 'Unknown',
                        hardwareConcurrency: workerInfo?.system?.hardwareConcurrency || 0,
                        deviceMemory: workerInfo?.system?.deviceMemory || 'unknown'
                    },
                    performance: {
                        benchmarkScore: workerInfo?.performance?.benchmarkScore || 0,
                        latency: workerInfo?.performance?.latency || 0
                    }
                });

                await createQueuePerClient(channel, socket.id, socket);
                broadcastWorkerList(io, workers);
            });

            socket.on("batch_result", async (data) => {
                const { clientId, results, result, tasksCount, method } = data;
                const state = clientStates.get(clientId);

                if (!state) return;

                if (state.completed === 0) {
                    state.start = Date.now();
                    state.method = method;
                    state.results = [];
                }

                if (Array.isArray(results) && results.length > 0) {
                    state.results.push(...results);
                } else if (result !== undefined && result !== null) {
                    state.results.push(result);
                }

                state.completed += tasksCount;

                const now = Date.now();
                if (now - state.lastUpdate >= 1000 || state.completed === state.expected) {
                    const clientSocket = clientSockets.get(clientId);
                    if (clientSocket) {
                        clientSocket.emit("task_progress", {
                            done: state.completed,
                            elapsedTime: Math.max(0, (now - state.start) / 1000)
                        });
                    }
                    state.lastUpdate = now;
                }

                if (state.completed === state.expected) {
                    try {
                        const rawResult = await getClientResult(clientId, state.results, activeCustomFunctions, tempDir);
                        const clientSocket = clientSockets.get(clientId);

                        if (clientSocket) {
                            clientSocket.emit("final_result", {
                                result: rawResult,
                                duration: ((now - state.start) / 1000).toFixed(2),
                                resultsCount: state.results.length
                            });
                        }
                    } catch (error) {
                        const fallbackSum = state.results.reduce((sum, val) => sum + val, 0);
                        const clientSocket = clientSockets.get(clientId);
                        if (clientSocket) {
                            clientSocket.emit("final_result", {
                                result: `Błąd getResult! Suma: ${fallbackSum}`,
                                duration: ((now - state.start) / 1000).toFixed(2),
                                resultsCount: state.results.length,
                                error: "getResult failed, using sum instead"
                            });
                        }
                    }
                    const taskInfo = clientTasks.get(clientId);
                    if (taskInfo) {
                        for (const wid of taskInfo.workerIds) {
                            if (workerLocks.get(wid) === clientId) {
                                workerLocks.delete(wid);
                            }
                        }
                        clientTasks.delete(clientId);
                    }

                    clientStates.delete(clientId);
                    tryToGiveTasksForWaitingClients();
                    broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);
                }
            });

            socket.on("ping_resultSocket", () => {
                socket.emit("pong_resultSocket");
            });

            socket.on("disconnect", () => {
                console.log("[Worker] Disconnected", socket.id);
                const queueName = `tasks.worker_${socket.id}`;
                channel.deleteQueue(queueName);
                workers.delete(socket.id);
                if (workerLocks.has(socket.id)) {
                    workerLocks.delete(socket.id);
                }
                broadcastWorkerList(io, workers);
            });
        });

        //klienci
        io.of("/client").on("connection", (socket) => {
            console.log("[Client] Connected", socket.id);
            clientSockets.set(socket.id, socket);

            socket.on("start", async ({ workerIds, taskParams }) => {
                const clientId = socket.id;
                const selected = workerIds.filter(id => workers.has(id));
                const tasks = await createTasks(taskParams);
                const allAvailable = selected.every(id => !workerLocks.has(id));

                if (allAvailable) {
                    for (const id of selected) {
                        workerLocks.set(id, clientId);
                    }

                    clientTasks.set(clientId, {
                        socket,
                        workerIds: selected
                    });

                    clientStates.set(clientId, {
                        expected: tasks.length,
                        completed: 0,
                        results: [],
                        start: 0,
                        lastUpdate: 0,
                        method: taskParams.method,
                        totalSamples: null
                    });

                    await tasksDevider3000(tasks, clientId, selected, taskParams, workers, channel);
                    broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);
                } else {
                    waitingClients.set(clientId, {
                        socket,
                        workerIds: selected,
                        tasks,
                        taskParams
                    });

                    for (const id of selected) {
                        if (!workerQueue.has(id)) {
                            workerQueue.set(id, []);
                        }
                        const queue = workerQueue.get(id);
                        if (!queue.includes(clientId)) {
                            queue.push(clientId);
                        }
                    }
                    broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);
                }
            });

            socket.on("request_worker_list", () => {
                broadcastWorkerList(io, workers);
                broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);
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

                clientStates.delete(socket.id);
                waitingClients.delete(socket.id);

                for (const [wid, queue] of workerQueue.entries()) {
                    workerQueue.set(wid, queue.filter(cid => cid !== socket.id));
                }
                broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks);

                // czyszczenie plikow od klienta
                if (activeCustomFunctions.has(socket.id)) {
                    deleteClientFiles(socket.id, tempDir);
                    activeCustomFunctions.delete(socket.id);
                    io.of("/worker").emit("unload_custom_wasm", { clientId: socket.id, sanitizedId: sanitizeJsIdentifier(socket.id) });
                }
            });
        });

        server.listen(8080, "0.0.0.0", () => {
            console.log("[Server] Listening on port 8080");
        });
    } catch (error) {
        console.error("[Server] Error during initialization:", error);
    }
}

start();