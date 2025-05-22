try {
    importScripts('benchmark/benchmark.js');
} catch (e) {
    console.error('[Worker] Failed to import scripts:', e);
    self.postMessage({ type: 'worker_error', data: { error: 'Failed to import critical scripts: ' + e.message } });
    throw e;
}

let score;
const clientModules = new Map();

function runBenchmark() {
    if (typeof BenchmarkModule === 'function') {
        const benchmarkModuleArgs = {
            locateFile: function (path, scriptDirectory) {
                if (path.endsWith('.wasm')) {
                    const wasmPath = `benchmark/${path}`;
                    return wasmPath;
                }
                return (scriptDirectory || '') + path;
            }
        };

        BenchmarkModule(benchmarkModuleArgs).then(benchmark => {
            const t0 = performance.now();
            benchmark.ccall("benchmark");
            const t1 = performance.now();
            score = (1 / Math.max(0.01, (t1 - t0))).toFixed(4) * 1000;
            self.postMessage({ type: 'benchmark_result', score: score });
        }).catch(error => {
            console.error("[Worker] Error during benchmark module initialization:", error);
            score = 0;
            self.postMessage({ type: 'benchmark_result', score: score, error: error.message });
        });
    } else {
        console.error("[Worker] BenchmarkModule is not defined.");
        score = 0;
        self.postMessage({ type: 'benchmark_result', score: score, error: 'BenchmarkModule not defined' });
    }
}

self.onmessage = async function (event) {
    const message = event.data;
    switch (message.type) {
        case 'run_benchmark':
            runBenchmark();
            break;
        case 'task_batch':
            const batch = message.data;
            const taskData = batch[0];
            const clientId = taskData.clientId;
            const sanitizedId = taskData.sanitizedId;
            let moduleToUse = null;

            try {
                moduleToUse = clientModules.get(clientId);
                if (!moduleToUse) {
                    console.log(`[Worker] Module for ${clientId} not in cache. Loading...`);
                    const customModuleArgs = {
                        locateFile: (path, prefix) => `temp/${path}`
                    };
                    moduleToUse = await loadClientModule(clientId, sanitizedId, customModuleArgs);
                }

                if (!moduleToUse) {
                    console.error(`[Worker] Module for clientId ${clientId} could not be loaded or retrieved.`);
                    self.postMessage({ type: 'worker_error', data: { clientId: clientId, error: "Module not available for processing." } });
                    return;
                }
                processBatch(batch, moduleToUse);
            } catch (error) {
                console.error(`[Worker] Error processing task_batch for clientId ${clientId}:`, error);
                self.postMessage({ type: 'worker_error', data: { clientId: clientId, error: `Error during task processing: ${error.message}` } });
            }
            break;
        case 'custom_wasm_available':
            const { clientId: wasmClientId, sanitizedId: wasmSanitizedId } = message.data;
            try {
                unloadClientModule(wasmClientId);
                const customModuleArgs = {
                    locateFile: (path, prefix) => `temp/${path}`
                };
                await loadClientModule(wasmClientId, wasmSanitizedId, customModuleArgs);
            } catch (error) {
                console.error(`[Worker] Error reloading custom WASM for ${wasmClientId}:`, error);
                self.postMessage({ type: 'worker_error', data: { clientId: wasmClientId, error: `Failed to reload custom WASM: ${error.message}` } });
            }
            break;
        case 'unload_custom_wasm':
            const { clientId: unloadClientId } = message.data;
            unloadClientModule(unloadClientId);
            break;
        default:
            console.log('[Worker] Received unhandled message type from main thread:', message.type);
    }
};


async function loadClientModule(clientId, sanitizedId, moduleArgs) {
    if (clientModules.has(clientId)) {
        console.log(`[Worker] Module for ${clientId} already in cache.`);
        return clientModules.get(clientId);
    }
    const scriptSrc = `./temp/${clientId}.js?v=${Date.now()}`;
    console.log(`[Worker] Loading module for ${clientId} from ${scriptSrc}`);

    try {
        importScripts(scriptSrc);

        const moduleFunctionName = `Module_${sanitizedId}`;
        if (typeof self[moduleFunctionName] === 'function') {
            const moduleFactory = self[moduleFunctionName];
            const instance = await moduleFactory(moduleArgs || {
                locateFile: (path, prefix) => `temp/${path}`
            });
            clientModules.set(clientId, instance);
            console.log(`[Worker] Successfully loaded and instantiated module for ${clientId}`);
            self.postMessage({ type: 'custom_module_loaded', data: { clientId } }); // Inform main thread
            return instance;
        } else {
            console.error(`[Worker] Module factory function "${moduleFunctionName}" not found on self after importing ${scriptSrc}.`);
            throw new Error(`Module factory ${moduleFunctionName} not found.`);
        }
    } catch (error) {
        console.error(`[Worker] Error loading module script ${scriptSrc} for client ${clientId}:`, error);
        self.postMessage({ type: 'worker_error', data: { clientId: clientId, error: `Failed to load module script: ${error.message}` } });
        throw error;
    }
}

function unloadClientModule(clientId) {
    if (clientModules.has(clientId)) {
        clientModules.delete(clientId);
    }
}

async function processBatch(batch, moduleInstance) {
    const method = batch[0].method;
    const clientId = batch[0].clientId;
    const originalBatchId = batch[0].taskId;
    const batchA = batch[0].a;
    const batchB = batch[0].b;

    let tasksProcessedInCurrentChunk = 0;
    let sumForCurrentChunk = 0;
    const TASKS_PER_PROGRESS_UPDATE = 5;
    const TASKS_BETWEEN_YIELDS = 10;

    for (let i = 0; i < batch.length; i++) {
        const data = batch[i];
        let result;

        try {
            if (data.method === 'montecarlo') {
                const seedOffset = data.seedOffset || 0;
                result = moduleInstance.ccall(
                    "monte_carlo", "number",
                    ["number", "number", "number", "number"],
                    [data.a, data.b, data.samples, seedOffset]
                );
            } else {
                result = moduleInstance.ccall(
                    "add", "number",
                    ["number", "number", "number"],
                    [data.a, data.b, data.dx]
                );
            }
            sumForCurrentChunk += result;
            tasksProcessedInCurrentChunk++;
        } catch (e) {
            console.error(`[Worker] Error executing ccall for task ${data.taskId} (method: ${data.method}):`, e);
            self.postMessage({ type: 'task_error', data: { taskId: data.taskId, clientId: clientId, error: `ccall execution failed: ${e.message}` } });
        }

        if (tasksProcessedInCurrentChunk > 0 && (tasksProcessedInCurrentChunk % TASKS_PER_PROGRESS_UPDATE === 0 || (i + 1) === batch.length)) {
            self.postMessage({
                type: 'batch_progress',
                data: {
                    batchId: originalBatchId,
                    clientId: clientId,
                    partialResult: sumForCurrentChunk,
                    tasksProcessedInChunk: tasksProcessedInCurrentChunk,
                    totalTasksInBatch: batch.length,
                    isFinalChunk: (i + 1) === batch.length,
                    method: method,
                    a: batchA,
                    b: batchB
                }
            });
            sumForCurrentChunk = 0;
            tasksProcessedInCurrentChunk = 0;
        }

        if ((i + 1) % TASKS_BETWEEN_YIELDS === 0 && i < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
}

self.onerror = function (message, source, lineno, colno, error) {
    console.error("[Worker] Uncaught error:", message, "at", source, lineno, colno, error);
    self.postMessage({ type: 'worker_error', data: { error: `Uncaught: ${message}`, source: source, lineno: lineno } });
    return true;
};

console.log('[Worker] Worker script loaded and initialized.');
self.postMessage({ type: 'worker_script_ready' });