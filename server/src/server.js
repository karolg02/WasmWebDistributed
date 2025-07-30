const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require('fs');
const path = require('path');

const { createQueuePerClient } = require("./modules/createQueuePerWorker");
const { connectToRabbitMQ } = require("./modules/rabbitmq/connectToRabbit");
const { getClientResult } = require("./modules/socket/client/clientResult");
const { broadcastWorkerList, broadcastWorkerQueueList } = require("./modules/socket/worker/broadcast");
const { tasksDevider3000 } = require("./modules/utils/tasksDivider3000");
const { tryToGiveTasksForWaitingClients } = require("./modules/common/tasksForClients");
const { uploadWasmHandler } = require("./modules/common/uploadWasm");
const { registerWorkerNamespace } = require("./modules/socket/worker/workerHandler");
const { registerClientNamespace } = require("./modules/socket/client/clientHandler");

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
]), uploadWasmHandler(activeCustomFunctions, io, tempDir));

app.use('/temp', express.static(tempDir));

async function start() {
    try {
        const { channel: ch } = await connectToRabbitMQ();
        channel = ch;
        
        //workerzy
        registerWorkerNamespace(
            io, channel, workers, createQueuePerClient, broadcastWorkerList, clientStates, clientSockets, getClientResult, activeCustomFunctions, tempDir, clientTasks, workerLocks, tryToGiveTasksForWaitingClients, waitingClients, workerQueue, tasksDevider3000, broadcastWorkerQueueList);

        //klienci
        registerClientNamespace(
            io, channel, workers, createQueuePerClient, broadcastWorkerList, clientStates, clientSockets, getClientResult, activeCustomFunctions, tempDir, clientTasks, workerLocks, tryToGiveTasksForWaitingClients, waitingClients, workerQueue, tasksDevider3000, broadcastWorkerQueueList);

        server.listen(8080, "0.0.0.0", () => {
            console.log("[Server] Listening on port 8080");
        });
    } catch (error) {
        console.error("[Server] Error during initialization:", error);
    }
}

start();