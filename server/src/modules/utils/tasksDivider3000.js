async function tasksDevider3000(tasks, clientId, selectedWorkerIds, originalTaskParams, workers, channel) {
    const benchmarks = selectedWorkerIds.map(id => ({
        id,
        benchmarkScore: workers.get(id)?.performance?.benchmarkScore || 0.1
    }));
    const totalBenchmarkScore = benchmarks.reduce((sum, worker) => sum + worker.benchmarkScore, 0);

    const taskCountPerWorker = benchmarks.map(worker => ({
        id: worker.id,
        count: Math.floor((worker.benchmarkScore / totalBenchmarkScore) * tasks.length),
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
            task.useCustomFunction = true;
            task.sanitizedId = originalTaskParams.sanitizedId;
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
                channel.sendToQueue(queueName, Buffer.from(JSON.stringify(batch)));
            }
        }
    }
}

module.exports = { tasksDevider3000 };