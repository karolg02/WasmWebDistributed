try {
    importScripts('benchmark/benchmark.js');
} catch (e) {
    console.error('[Worker] Failed to import scripts:', e);
    self.postMessage({ type: 'worker_error', data: { error: 'Failed to import critical scripts: ' + e.message } });
    throw e;
}

let score;
const clientModules = new Map();
let globalModuleFactory = null;

async function initializeGlobalModule() {
    try {
        if (!globalModuleFactory) {
            importScripts('./loader.js');
            if (typeof self['Module'] === 'function') {
                globalModuleFactory = self['Module'];
            } else {
                throw new Error('Module factory not found in loader.js');
            }
        }
    } catch (error) {
        console.error('[Worker] Error loading global module:', error);
        throw error;
    }
}

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

            // po zakończeniu ladujemy globalny modul loadera
            initializeGlobalModule().then().catch(error => {
                console.error('[Worker] Failed to initialize global module after benchmark:', error);
            });
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
                    const customModuleArgs = {
                        locateFile: (path, prefix) => `temp/${sanitizedId}.wasm`
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
                    locateFile: (path, prefix) => `temp/${wasmSanitizedId}.wasm`
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
    }
};

async function loadClientModule(clientId, sanitizedId, moduleArgs) {
    if (clientModules.has(clientId)) {
        return clientModules.get(clientId);
    }

    try {
        if (!globalModuleFactory) {
            await initializeGlobalModule();
        }

        const instance = await globalModuleFactory(moduleArgs || {
            locateFile: (path, prefix) => {
                if (path.endsWith('.wasm')) {
                    return `temp/${sanitizedId}.wasm`;
                }
                return `temp/${path}`;
            }
        });

        clientModules.set(clientId, instance);
        self.postMessage({ type: 'custom_module_loaded', data: { clientId } });
        return instance;
    } catch (error) {
        console.error(`[Worker] Error creating module instance for client ${clientId}:`, error);
        self.postMessage({ type: 'worker_error', data: { clientId: clientId, error: `Failed to create module instance: ${error.message}` } });
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
    const TASKS_PER_PROGRESS_UPDATE = 10;
    const TASKS_BETWEEN_YIELDS = 10;

    const maxParamsLength = Math.max(...batch.map(task => task.paramsArray.length));
    const maxArraySize = maxParamsLength * 8;
    const sharedArrayPtr = moduleInstance._malloc(maxArraySize);

    if (!sharedArrayPtr) {
        throw new Error('Failed to allocate shared memory in WASM');
    }

    try {
        for (let i = 0; i < batch.length; i++) {
            const data = batch[i];
            let result;

            try {
                if (data.method === 'custom1D' || data.method === 'custom2D') {
                    const params = data.paramsArray;
                    for (let j = 0; j < params.length; j++) {
                        moduleInstance.setValue(sharedArrayPtr + j * 8, params[j], 'double');
                    }
                    result = moduleInstance.ccall(
                        "main_function", "number",
                        ["number"],
                        [sharedArrayPtr]
                    );
                }

                if (result !== undefined && !isNaN(result)) {
                    sumForCurrentChunk += result;
                    tasksProcessedInCurrentChunk++;
                } else {
                    console.error(`[Worker] Invalid result from task ${data.taskId}:`, result);
                }
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
    } finally {
        moduleInstance._free(sharedArrayPtr);
    }
}

self.onerror = function (message, source, lineno, colno, error) {
    self.postMessage({ type: 'worker_error', data: { error: `Uncaught: ${message}`, source: source, lineno: lineno } });
    return true;
};

self.postMessage({ type: 'worker_script_ready' });