const express = require('express');
const router = express.Router();
const { Server } = require("socket.io");

const http = require("http");
const path = require('path');

const { createQueuePerWorker } = require("./modules/socket/worker/createQueuePerWorker");
const { connectToRabbitMQ } = require("./modules/rabbitmq/connectToRabbit");
const { getClientResult } = require("./modules/socket/client/clientResult");
const { broadcastWorkerList, broadcastWorkerQueueList } = require("./modules/socket/worker/broadcast");
const { tasksDevider3000 } = require("./modules/utils/tasksDivider3000");
const { tryToGiveTasksForWaitingClients } = require("./modules/common/tasksForClients");
const { uploadWasmHandler } = require("./modules/common/uploadWasm");
const { registerWorkerNamespace } = require("./modules/socket/worker/workerHandler");
const { registerClientNamespace } = require("./modules/socket/client/clientHandler");
const { getMulterUpload, ensureTempDir } = require("./modules/common/config");
const { configureExpress, registerRoutes } = require("./modules/common/expressConfig");
const db = require('./modules/common/db');
const auth = require('./modules/socket/auth');

const app = express();
configureExpress(app);

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

const tempDir = path.join(__dirname, '../temp');
ensureTempDir(tempDir);

const upload = getMulterUpload(tempDir);

registerRoutes(app, upload, uploadWasmHandler(activeCustomFunctions, io, tempDir), tempDir);

let channel = null;
async function start() {
    try {
        const { channel: ch } = await connectToRabbitMQ();
        channel = ch;
        
        //workerzy
        registerWorkerNamespace(
            io, channel, workers, createQueuePerWorker, broadcastWorkerList, clientStates, clientSockets, getClientResult, activeCustomFunctions, tempDir, clientTasks, workerLocks, tryToGiveTasksForWaitingClients, waitingClients, workerQueue, tasksDevider3000, broadcastWorkerQueueList);

        //klienci
        registerClientNamespace(
            io, channel, workers, broadcastWorkerList, clientStates, clientSockets, activeCustomFunctions, tempDir, clientTasks, workerLocks, tryToGiveTasksForWaitingClients, waitingClients, workerQueue, tasksDevider3000, broadcastWorkerQueueList);

        server.listen(8080, "0.0.0.0", () => {
            console.log("[Server] Listening on port 8080");
        });
    } catch (error) {
        console.error("[Server] Error during initialization:", error);
    }
}

start();

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const token = await auth.register(username, email, password);
    res.json({ token });
  } catch (err) {
    if (err.message === 'USER_EXISTS') return res.status(409).json({ error: 'User exists' });
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const token = await auth.login(username, password);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
