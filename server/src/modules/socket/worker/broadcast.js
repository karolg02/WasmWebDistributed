async function broadcastWorkerList(io, workers) {
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

async function broadcastWorkerQueueList(io, workers, workerLocks, workerQueue, clientTasks) {
    const queueStatus = {};
    for (const [workerId] of workers.entries()) {
        const currentClient = workerLocks.get(workerId);
        const queue = workerQueue.get(workerId) || [];
        const isCalculating = currentClient && clientTasks.has(currentClient);

        queueStatus[workerId] = {
            workerId,
            queueLength: queue.length,
            currentClient: currentClient || null,
            isAvailable: !currentClient,
            isCalculating: isCalculating || false
        };
    }
    io.of("/client").emit("queue_status", queueStatus);
}

module.exports = { broadcastWorkerList, broadcastWorkerQueueList };