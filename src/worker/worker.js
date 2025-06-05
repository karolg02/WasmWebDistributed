try {
    importScripts('benchmark/benchmark.js');
} catch (e) {
    console.error('[Worker] Failed to import scripts:', e);
    self.postMessage({ type: 'worker_error', data: { error: 'Failed to import critical scripts: ' + e.message } });
    throw e;
}

let isProcessing = false;
let score;
const loadedModules = new Map();

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

async function loadCustomModule(sanitizedId) {
    if (loadedModules.has(sanitizedId)) {
        return loadedModules.get(sanitizedId);
    }

    // Pliki są serwowane przez główny serwer Node.js na porcie 8080
    const serverOrigin = `http://${self.location.hostname}:8080`; // Użyj portu 8080
    const scriptUrl = `${serverOrigin}/temp/${sanitizedId}.js`;
    const wasmUrl = `${serverOrigin}/temp/${sanitizedId}.wasm`; // Jawna ścieżka do pliku .wasm

    try {
        console.log(`[Worker] Attempting to load custom module script from: ${scriptUrl}`);
        importScripts(scriptUrl); // Załaduj JS z serwera na porcie 8080

        if (typeof Module !== 'undefined') {
            console.log(`[Worker] Module factory found, initializing... Attempting to load WASM from ${wasmUrl}`);

            const moduleArgs = {
                // locateFile jest potrzebne, aby wskazać Emscripten, skąd ma pobrać plik .wasm,
                // zwłaszcza gdy nie jest on w tej samej lokalizacji względnej co skrypt JS
                // lub gdy skrypt JS jest ładowany z innego origin/portu niż worker.
                locateFile: function (path, scriptDirectory) {
                    if (path.endsWith('.wasm')) {
                        // Zawsze zwracaj pełną, poprawną ścieżkę do pliku .wasm na serwerze 8080
                        return wasmUrl;
                    }
                    // Dla innych potencjalnych plików (choć zwykle tylko .wasm jest potrzebny)
                    return (scriptDirectory || '') + path;
                }
            };

            const moduleInstance = await Module(moduleArgs); // Przekaż argumenty do fabryki Modułu
            loadedModules.set(sanitizedId, moduleInstance);
            console.log(`[Worker] Module ${sanitizedId} loaded and initialized successfully`);
            return moduleInstance;
        } else {
            // Ten błąd wystąpi, jeśli importScripts(scriptUrl) się powiedzie, ale plik JS
            // z jakiegoś powodu nie zdefiniuje globalnego 'Module'.
            throw new Error(`Global 'Module' was not defined after loading script from ${scriptUrl}. Check the script content and the server response for this URL.`);
        }
    } catch (error) {
        // Ten blok catch złapie błędy zarówno z importScripts (np. 404 dla pliku JS),
        // jak i z inicjalizacji modułu (np. błąd ładowania WASM).
        console.error(`[Worker] Failed to load or initialize module ${sanitizedId} (JS: ${scriptUrl}, Expected WASM: ${wasmUrl}):`, error);
        throw new Error(`Failed to load/initialize module ${sanitizedId}: ${error.message}`);
    }
}

async function executeCustomTask(task, sanitizedId) {
    try {
        const module = await loadCustomModule(sanitizedId);

        if (task.method === 'custom1D') {
            console.log(`[Worker] Executing custom1D task: a=${task.a}, b=${task.b}, dx=${task.dx}`);
            return module.ccall('main_function', 'number',
                ['number', 'number', 'number'],
                [task.a, task.b, task.dx]
            );
        } else if (task.method === 'custom2D') {
            console.log(`[Worker] Executing custom2D task: a=${task.a}, b=${task.b}, c=${task.c}, d=${task.d}`);
            return module.ccall('main_function', 'number',
                ['number', 'number', 'number', 'number', 'number', 'number'],
                [task.a, task.b, task.dx, task.c, task.d, task.dy]
            );
        } else {
            throw new Error(`Unsupported method: ${task.method}`);
        }
    } catch (error) {
        console.error(`[Worker] Error executing task:`, error);
        throw error;
    }
}

async function processBatch(tasks) {
    if (!tasks || tasks.length === 0) {
        console.log('[Worker] No tasks to process');
        return;
    }

    const clientId = tasks[0].clientId;
    const sanitizedId = tasks[0].sanitizedId;
    const method = tasks[0].method;

    console.log(`[Worker] Processing batch of ${tasks.length} tasks for client ${clientId}, method: ${method}, sanitizedId: ${sanitizedId}`);

    let partialResult = 0;
    let tasksProcessed = 0;

    try {
        for (let i = 0; i < tasks.length; i++) {
            const currentTask = tasks[i];
            console.log(`[Worker] Processing task ${i + 1}/${tasks.length}:`, currentTask);

            try {
                const result = await executeCustomTask(currentTask, sanitizedId);
                partialResult += result;
                tasksProcessed++;
                console.log(`[Worker] Task ${i + 1} result: ${result}`);
            } catch (taskError) {
                console.error(`[Worker] Error in task ${i + 1}:`, taskError);
                self.postMessage({
                    type: 'task_error',
                    data: {
                        clientId,
                        error: taskError.message,
                        taskId: currentTask?.taskId || `task_${i}`
                    }
                });
                // Kontynuuj z pozostałymi zadaniami
                continue;
            }
        }

        console.log(`[Worker] Batch completed. Total result: ${partialResult}, tasks processed: ${tasksProcessed}`);

        // Wyślij wyniki tylko jeśli udało się przetworzyć jakieś zadania
        if (tasksProcessed > 0) {
            self.postMessage({
                type: 'batch_progress',
                data: {
                    clientId,
                    partialResult: partialResult,
                    tasksProcessedInChunk: tasksProcessed,
                    method,
                    a: tasks[0].a,
                    b: tasks[tasks.length - 1].b
                }
            });
        }

    } catch (error) {
        console.error(`[Worker] Critical error in processBatch:`, error);
        self.postMessage({
            type: 'worker_error',
            data: {
                clientId,
                error: error.message,
                batchSize: tasks.length
            }
        });
    }
}

self.onmessage = async function (event) {
    const message = event.data;
    console.log(`[Worker] Received message:`, message.type, message);

    switch (message.type) {
        case 'run_benchmark':
            runBenchmark();
            break;
        case 'task_batch':
            if (isProcessing) {
                console.log('[Worker] Already processing, ignoring new batch');
                return;
            }

            console.log(`[Worker] Starting to process batch of ${message.data?.length || 0} tasks`);
            isProcessing = true;

            try {
                await processBatch(message.data);
            } catch (error) {
                console.error('[Worker] Error in task_batch handler:', error);
                self.postMessage({
                    type: 'worker_error',
                    data: {
                        clientId: message.data[0]?.clientId || 'unknown',
                        error: error.message
                    }
                });
            } finally {
                isProcessing = false;
                console.log('[Worker] Finished processing batch');
            }
            break;
        case 'custom_wasm_available':
            console.log(`[Worker] Custom WASM available for client: ${message.data.clientId}`);
            self.postMessage({
                type: 'custom_module_loaded',
                data: { clientId: message.data.clientId }
            });
            break;
        case 'unload_custom_wasm':
            console.log(`[Worker] Unloading WASM for: ${message.data.sanitizedId}`);
            if (loadedModules.has(message.data.sanitizedId)) {
                loadedModules.delete(message.data.sanitizedId);
            }
            break;
        default:
            console.log('[Worker] Received unhandled message type:', message.type);
    }
};

self.onerror = function (message, source, lineno, colno, error) {
    console.error("[Worker] Uncaught error:", message, "at", source, lineno, colno, error);
    self.postMessage({
        type: 'worker_error',
        data: {
            error: `Uncaught: ${message}`,
            source: source,
            lineno: lineno
        }
    });
    return true;
};

console.log('[Worker] Worker script loaded and initialized.');
self.postMessage({ type: 'worker_script_ready' });