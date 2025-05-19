const { Server } = require("socket.io");
const amqp = require("amqplib");
const http = require("http");
const { createTasks } = require("../../create_tasks");
const { createQueuePerClient } = require("./modules/queue");
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const server = http.createServer();
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
let connection = null;

const tempDir = path.join(__dirname, '../worker/temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

async function broadcastWorkerList() {
    const list = Array.from(workers.entries()).map(([id, worker]) => ({
        id,
        name: worker.name,
        specs: {
            platform: worker.specs.platform,
            userAgent: worker.specs.userAgent,
            language: worker.specs.language,
            hardwareConcurrency: worker.specs.hardwareConcurrency,
            deviceMemory: worker.specs.deviceMemory
        },
        performance: {
            benchmarkScore: worker.performance.benchmarkScore,
            latency: worker.performance.latency
        }
    }));
    io.of("/client").emit("worker_update", list);
}

async function broadcastQueueStatus() {
    const queueStatus = {};
    for (const [workerId] of workers.entries()) {
        const currentClient = workerLocks.get(workerId);
        const queue = workerQueue.get(workerId) || [];

        queueStatus[workerId] = {
            workerId,
            queueLength: queue.length,
            currentClient: currentClient || null,
            isAvailable: !currentClient
        };
    }

    io.of("/client").emit("queue_status", queueStatus);
}

async function tasksDevider3000(tasks, clientId, selectedWorkerIds, originalTaskParams) { // Added originalTaskParams
    const benchmarks = selectedWorkerIds.map(id => ({
        id,
        // Ensure workers.get(id) exists and has performance before accessing benchmarkScore
        benchmarkScore: workers.get(id)?.performance?.benchmarkScore || 0.1
    }));
    const totalBenchmarkScore = benchmarks.reduce((sum, worker) => sum + worker.benchmarkScore, 0);

    // Handle division by zero if totalBenchmarkScore is 0
    const safeTotalBenchmarkScore = totalBenchmarkScore === 0 ? 1 : totalBenchmarkScore;

    const taskCountPerWorker = benchmarks.map(worker => ({
        id: worker.id,
        count: Math.floor((worker.benchmarkScore / safeTotalBenchmarkScore) * tasks.length),
        // Use worker's actual benchmarkScore for batchSize calculation
        batchSize: Math.max(50, Math.min(1000, Math.round(((workers.get(worker.id)?.performance?.benchmarkScore || 0.1) * 100) / 50) * 50))
    }));
    let assigned = taskCountPerWorker.reduce((sum, worker) => sum + worker.count, 0);
    let remaining = tasks.length - assigned;

    if (remaining > 0) {
        const workersByScore = [...taskCountPerWorker]
            .sort((a, b) => (b.benchmarkScore || 0) - (a.benchmarkScore || 0));

        for (let i = 0; remaining > 0; i = (i + 1) % workersByScore.length) {
            workersByScore[i].count += 1;
            remaining--;
        }
    }

    let taskIndex = 0;
    const workerTasks = new Map();

    for (const { id, count } of taskCountPerWorker) {
        if (!workerTasks.has(id)) {
            workerTasks.set(id, []);
        }

        const workerTaskList = workerTasks.get(id);
        for (let j = 0; j < count && taskIndex < tasks.length; j++) {
            const task = tasks[taskIndex];
            task.clientId = clientId;

            // --- THIS IS THE CRITICAL ADDITION ---
            // if (originalTaskParams.useCustomFunction) { // REMOVED Condition
            task.useCustomFunction = true; // Always true now
            task.sanitizedId = originalTaskParams.sanitizedId; // sanitizedId comes from compilation
            // } else { // REMOVED Else
            //     task.useCustomFunction = false;
            // }
            // --- END OF CRITICAL ADDITION ---

            workerTaskList.push(task);
            taskIndex++;
        }
    }

    for (const { id, batchSize } of taskCountPerWorker) {
        const queueName = `tasks.worker_${id}`;
        const workerTaskList = workerTasks.get(id) || [];

        for (let i = 0; i < workerTaskList.length; i += batchSize) {
            const batch = workerTaskList.slice(i, i + batchSize);
            if (batch.length > 0) {
                // console.log(`[Server] Sending batch to ${queueName}, first task useCustom: ${batch[0].useCustomFunction}, sanitizedId: ${batch[0].sanitizedId}`); // For debugging
                channel.sendToQueue(queueName, Buffer.from(JSON.stringify(batch)));
            }
        }
    }
}

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
            sum: 0,
            start: 0,
            lastUpdate: 0,
            method: pending.taskParams.method, // Use method from pending.taskParams
            // Use N from pending.taskParams for montecarlo totalSamples
            totalSamples: pending.taskParams.method === 'montecarlo' ? pending.taskParams.N : null
        });
        // Pass pending.taskParams to tasksDevider3000
        await tasksDevider3000(pending.tasks, clientId, pending.workerIds, pending.taskParams);
    }
}

async function start() {
    connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();

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
            broadcastWorkerList();
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
                let finalResult = state.sum;
                if (state.method === 'montecarlo') {
                    const area = (state.b - state.a) * state.y_max;
                    finalResult = (state.sum / state.totalSamples) * area;
                }

                const clientSocket = clientSockets.get(clientId);
                if (clientSocket) {
                    clientSocket.emit("final_result", {
                        sum: parseFloat(finalResult.toFixed(6)),
                        duration: ((now - state.start) / 1000).toFixed(2)
                    });
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
                broadcastQueueStatus();
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
            broadcastWorkerList();
        });
    });

    //klienci
    io.of("/client").on("connection", (socket) => {
        console.log("[Client] Connected", socket.id);
        clientSockets.set(socket.id, socket);
        broadcastWorkerList();

        socket.on("submit_custom_function", async (data) => {
            const { functionCode } = data;
            const clientId = socket.id;

            console.log(`[Client] ${clientId} submitted custom function`);

            try {
                // Validate function code (basic security)
                if (!functionCode || typeof functionCode !== 'string') {
                    socket.emit("custom_function_result", {
                        success: false,
                        error: "Invalid function code"
                    });
                    return;
                }

                // Compile function
                const result = await compileFunctionToWasm(clientId, functionCode);

                if (result.success) {
                    // activeCustomFunctions.set(clientId, true); // Old
                    activeCustomFunctions.set(clientId, { // Corrected: store sanitizedId
                        active: true,
                        sanitizedId: result.sanitizedId
                    });


                    // Notify all workers about the new custom function
                    io.of("/worker").emit("custom_wasm_available", {
                        clientId,
                        sanitizedId: result.sanitizedId, // Ensure this is sent
                        timestamp: Date.now()
                    });

                    socket.emit("custom_function_result", {
                        success: true,
                        message: "Function compiled successfully",
                        sanitizedId: result.sanitizedId // Ensure this is sent
                    });
                } else {
                    socket.emit("custom_function_result", {
                        success: false,
                        error: result.error
                    });
                }
            } catch (error) {
                console.error("[Server] Error processing custom function:", error);
                socket.emit("custom_function_result", {
                    success: false,
                    error: "Server error processing function"
                });
            }
        });

        socket.on("start", async ({ workerIds, taskParams }) => {
            const clientId = socket.id;

            // useCustomFunction flag is removed from taskParams by client,
            // but server logic now assumes it's always a custom function.
            // We primarily need to ensure sanitizedId is present.
            if (!taskParams.customFunction || !taskParams.sanitizedId) {
                // This case should ideally be prevented by client-side validation & compilation step
                console.error(`[Server] CRITICAL: Client ${clientId} starting task but customFunction or sanitizedId is missing. TaskParams:`, taskParams);
                socket.emit("task_error", { error: "Błąd: Funkcja lub jej identyfikator (sanitizedId) są brakujące po stronie serwera." });
                return;
            }
            // taskParams.useCustomFunction = true; // No longer needed to set this explicitly

            const selected = workerIds.filter(id => workers.has(id));
            if (selected.length === 0) {
                console.warn(`[Server] No valid workers selected by client ${clientId}. Aborting task.`);
                socket.emit("task_error", { error: "No valid workers selected or available." });
                return;
            }
            const tasks = await createTasks(taskParams);
            // const clientId = socket.id; // Moved up

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
                    sum: 0,
                    start: 0,
                    lastUpdate: 0,
                    method: taskParams.method, // Ensure taskParams has method
                    // Use taskParams.N for montecarlo totalSamples if that's where it's defined
                    totalSamples: taskParams.method === 'montecarlo' ? taskParams.N : null
                });

                await tasksDevider3000(tasks, clientId, selected, taskParams); // Pass original taskParams
                broadcastQueueStatus();
            } else {
                waitingClients.set(clientId, {
                    socket,
                    workerIds: selected,
                    tasks,
                    taskParams // Store original taskParams
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
                broadcastQueueStatus();
            }
        });

        socket.on("request_worker_list", () => {
            broadcastWorkerList();
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
            broadcastQueueStatus();

            // Clean up custom function files if any
            if (activeCustomFunctions.has(socket.id)) {
                cleanupClientFiles(socket.id);
                // Notify workers to unload custom WASM
                io.of("/worker").emit("unload_custom_wasm", { clientId: socket.id });
            }
        });
    });

    server.listen(8080, "0.0.0.0", () => {
        console.log("[Server] Listening on port 8080");
    });
}

start();

// Temp directory already defined at the top of the file
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Function to sanitize JavaScript identifier
function sanitizeJsIdentifier(id) {
    // Replace any non-alphanumeric characters (except underscores) with underscores
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

// Function to compile C++ code to WASM
async function compileFunctionToWasm(clientId, functionCode) {
    console.log(`[Server] Compiling custom function for client ${clientId}`);

    // Sanitize the client ID for use as a JS identifier
    const sanitizedId = sanitizeJsIdentifier(clientId);

    // Create a C++ file from template
    const cppFilePath = path.join(tempDir, `${clientId}.cpp`);

    // Template for the C++ file
    const cppTemplate = `
#include <stdio.h>
#include <cmath>
#include <stdlib.h>
#include <time.h>
#include <emscripten/emscripten.h>

extern "C" {
    // The user-defined function
    double funkcja(double x) {
        return ${functionCode};
    }

    EMSCRIPTEN_KEEPALIVE
    double add(double a, double b, double dx) {
        int N = ceil((b - a) / dx);
        double dx_adjust = (b - a) / N;
        int i;
        double calka = 0.0;
        for (i = 0; i < N; i++) {
            double x1 = a + i * dx_adjust;
            calka += 0.5 * dx_adjust * (funkcja(x1) + funkcja(x1 + dx_adjust));
        }
        return (calka);
    }
}
    `;

    fs.writeFileSync(cppFilePath, cppTemplate);

    // Compile the C++ file to WASM
    try {
        const wasmFile = path.join(tempDir, `${clientId}.wasm`);
        const jsFile = path.join(tempDir, `${clientId}.js`);

        // Use the sanitized ID for the module name
        const compileCommand = `source ~/emsdk/emsdk_env.sh && emcc "${cppFilePath}" -o "${jsFile}" \
-sEXPORTED_FUNCTIONS=_add \
-sEXPORTED_RUNTIME_METHODS=ccall \
-sENVIRONMENT=web \
-sMODULARIZE=1 \
-sEXPORT_NAME="Module_${sanitizedId}"`;

        await execPromise(compileCommand);

        console.log(`[Server] Compilation successful for client ${clientId}`);

        // Store both original ID and sanitized ID
        activeCustomFunctions.set(clientId, {
            active: true,
            sanitizedId
        });

        return {
            success: true,
            jsFile,
            wasmFile,
            sanitizedId
        };
    } catch (error) {
        console.error(`[Server] Compilation failed for client ${clientId}:`, error);
        return { success: false, error: error.message };
    }
}

function cleanupClientFiles(clientId) {
    const filesToRemove = [
        path.join(tempDir, `${clientId}.cpp`),
        path.join(tempDir, `${clientId}.js`),
        path.join(tempDir, `${clientId}.wasm`)
    ];

    filesToRemove.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`[Server] Removed file: ${file}`);
        }
    });

    activeCustomFunctions.delete(clientId);
}