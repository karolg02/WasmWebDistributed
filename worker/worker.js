try {
    importScripts('benchmark/benchmark.js');
} catch (e) {
    self.postMessage({ type: 'worker_error', data: { error: 'Cannot import benchmark script: ' + e.message } });
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
            score = 0;
            self.postMessage({ type: 'benchmark_result', score: score, error: error.message });
        });
    } else {
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
                        locateFile: (path, prefix) => `http://${self.location.hostname}:8080/temp/${sanitizedId}.wasm`
                    };
                    moduleToUse = await loadClientModule(clientId, sanitizedId, customModuleArgs);
                }

                if (!moduleToUse) {
                    self.postMessage({ type: 'worker_error', data: { clientId: clientId, error: "Module not available for processing." } });
                    return;
                }
                processBatch(batch, moduleToUse);
            } catch (error) {
                self.postMessage({ type: 'worker_error', data: { clientId: clientId, error: `Error during task processing: ${error.message}` } });
            }
            break;
        case 'custom_wasm_available':
            const { clientId: wasmClientId, sanitizedId: wasmSanitizedId } = message.data;
            try {
                unloadClientModule(wasmClientId);
                const customModuleArgs = {
                    locateFile: (path, prefix) => `http://${self.location.hostname}:8080/temp/${wasmSanitizedId}.wasm`
                };
                await loadClientModule(wasmClientId, wasmSanitizedId, customModuleArgs);
            } catch (error) {
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
        const loaderUrl = `http://${self.location.hostname}:8080/temp/${sanitizedId}.js`;
        try {
            importScripts(loaderUrl);
        } catch (importError) {
            throw new Error(`Failed to import client loader from ${loaderUrl}: ${importError.message}`);
        }
        const clientModuleFactory = self['Module'];

        if (!clientModuleFactory || typeof clientModuleFactory !== 'function') {
            throw new Error(`Client module factory not found for ${clientId}. Expected 'Module' function in global scope after importing ${loaderUrl}`);
        }
        const instance = await clientModuleFactory({
            locateFile: (path, prefix) => {
                if (path.endsWith('.wasm')) {
                    return `http://${self.location.hostname}:8080/temp/${sanitizedId}.wasm`;
                }
                return `http://${self.location.hostname}:8080/temp/${path}`;
            }
        });

        clientModules.set(clientId, instance);
        self.postMessage({ type: 'custom_module_loaded', data: { clientId } });
        return instance;

    } catch (error) {
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
    let resultsForCurrentChunk = [];
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
                const params = data.paramsArray;
                for (let j = 0; j < params.length; j++) {
                    moduleInstance.setValue(sharedArrayPtr + j * 8, params[j], 'double');
                }
                result = moduleInstance.ccall(
                    "main_function", "number",
                    ["number"],
                    [sharedArrayPtr]
                );

                if (result !== undefined && !isNaN(result)) {
                    resultsForCurrentChunk.push(result);
                    tasksProcessedInCurrentChunk++;
                } else {
                    console.error(`[Worker] Invalid result from task ${data.taskId}:`, result);
                }
            } catch (e) {
                self.postMessage({ type: 'task_error', data: { taskId: data.taskId, clientId: clientId, error: `ccall execution failed: ${e.message}` } });
            }

            if (tasksProcessedInCurrentChunk > 0 && (tasksProcessedInCurrentChunk % TASKS_PER_PROGRESS_UPDATE === 0 || (i + 1) === batch.length)) {
                self.postMessage({
                    type: 'batch_progress',
                    data: {
                        batchId: originalBatchId,
                        clientId: clientId,
                        results: resultsForCurrentChunk,
                        tasksProcessedInChunk: tasksProcessedInCurrentChunk,
                        totalTasksInBatch: batch.length,
                        isFinalChunk: (i + 1) === batch.length,
                        method: method,
                        a: batchA,
                        b: batchB
                    }
                });
                resultsForCurrentChunk = [];
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

self.onerror = function (message, source, lineno) {
    self.postMessage({ type: 'worker_error', data: { error: `Uncaught: ${message}`, source: source, lineno: lineno } });
    return true;
};

self.postMessage({ type: 'worker_script_ready' });