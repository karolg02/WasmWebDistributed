const express = require('express');
const { Server } = require("socket.io");
const http = require("http");
const path = require('path');

const { createApp } = require('./app');
const { createQueuePerWorker } = require("./modules/socket/worker/createQueuePerWorker");
const { connectToRabbitMQ } = require("./modules/rabbitmq/connectToRabbit");
const { getClientResult } = require("./modules/socket/client/clientResult");
const { broadcastWorkerList, broadcastWorkerQueueList } = require("./modules/socket/worker/broadcast");
const { tasksDevider3000 } = require("./modules/utils/tasksDivider3000");
const { tryToGiveTasksForWaitingClients } = require("./modules/common/tasksForClients");
const { registerWorkerNamespace } = require("./modules/socket/worker/workerHandler");
const { registerClientNamespace } = require("./modules/socket/client/clientHandler");
const { startScheduler } = require('./modules/scheduler/taskScheduler');

const workers = new Map();
const clientSockets = new Map();
const clientTasks = new Map();
const workerLocks = new Map();
const workerQueue = new Map();
const waitingClients = new Map();
const clientStates = new Map();
const activeCustomFunctions = new Map();

const tempDir = path.join(__dirname, '../temp');

// Create server and io first
const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*" }
});

// Then create app with io
const app = createApp({ io, activeCustomFunctions, tempDir });

// Attach app to server
server.on('request', app);

let channel = null;
async function start() {
    try {
        const { channel: ch } = await connectToRabbitMQ();
        channel = ch;
        
        //workerzy
        registerWorkerNamespace(
            io,
            channel,
            workers,
            createQueuePerWorker,
            broadcastWorkerList,
            clientStates,
            clientSockets,
            getClientResult,
            activeCustomFunctions,
            tempDir,
            clientTasks,
            workerLocks,
            tryToGiveTasksForWaitingClients,
            waitingClients,
            workerQueue,
            tasksDevider3000,
            broadcastWorkerQueueList
        );

        //klienci
        registerClientNamespace(
            io,
            channel,
            workers,
            broadcastWorkerList,
            clientStates,
            clientSockets,
            activeCustomFunctions,
            tempDir,
            clientTasks,
            workerLocks,
            tryToGiveTasksForWaitingClients,
            waitingClients,
            workerQueue,
            tasksDevider3000,
            broadcastWorkerQueueList
        );

        server.listen(8080, "0.0.0.0", () => {
            console.log("[Server] Listening on port 8080");
            startScheduler();
        });
    } catch (error) {
        console.error("[Server] Error during initialization:", error);
    }
}

start();
