async function tasksDevider3000(tasks, clientId, selectedWorkerIds, originalTaskParams, workers, channel) {
    if (!tasks.length || !selectedWorkerIds.length) {
        console.warn('[TasksDivider] No tasks or workers provided');
        return;
    }

    // 1. Przygotuj dane workerów
    const activeWorkers = selectedWorkerIds
        .map(id => ({
            id,
            worker: workers.get(id),
            score: Math.max(0.1, workers.get(id)?.performance?.benchmarkScore || 0.1)
        }))
        .filter(w => w.worker);

    if (!activeWorkers.length) {
        console.warn('[TasksDivider] No workers found');
        return;
    }

    console.log(`[TasksDivider] Distributing ${tasks.length} tasks among ${activeWorkers.length} workers`);

    // 2. Oblicz wagi i podział zadań
    const totalScore = activeWorkers.reduce((sum, w) => sum + w.score, 0);
    const distribution = distributeTasksWithFixedBatches(tasks, activeWorkers, totalScore);

    // 3. Wyślij zadania - zawsze 10 paczek na workera
    await sendTasksToWorkers(distribution, clientId, originalTaskParams, channel);

    // 4. Zwróć statystyki
    return {
        totalTasks: tasks.length,
        workersUsed: activeWorkers.length,
        distribution: distribution.map(d => ({
            workerId: d.workerId,
            tasksAssigned: d.tasks.length,
            batchCount: d.batches.length,
            avgBatchSize: Math.round(d.tasks.length / d.batches.length),
            benchmarkScore: d.score
        }))
    };
}

// NAJLEPSZA WERSJA - Weighted Round Robin
function distributeTasksWithFixedBatches(tasks, workers, totalScore) {
    const distribution = workers.map(worker => ({
        workerId: worker.id,
        score: worker.score,
        weight: worker.score / totalScore,
        tasks: [],
        batches: [],
        quota: 0
    }));

    // Weighted round-robin assignment
    for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
        // Znajdź workera z największym deficytem
        let bestWorker = null;
        let maxDeficit = -1;

        for (const worker of distribution) {
            worker.quota = (taskIndex + 1) * worker.weight;
            const deficit = worker.quota - worker.tasks.length;
            
            if (deficit > maxDeficit) {
                maxDeficit = deficit;
                bestWorker = worker;
            }
        }

        if (bestWorker) {
            bestWorker.tasks.push(tasks[taskIndex]);
        }
    }

    // Podziel zadania każdego workera na paczki
    for (const worker of distribution) {
        worker.batches = createFixedBatches(worker.tasks, 10);
    }

    return distribution;
}

// Tworzy dokładnie N paczek (lub mniej jeśli za mało zadań)
function createFixedBatches(tasks, targetBatchCount) {
    if (tasks.length === 0) return [];
    
    // Jeśli zadań mniej niż docelowa liczba paczek, rób po 1 zadaniu na paczkę
    const actualBatchCount = Math.min(targetBatchCount, tasks.length);
    const batches = [];
    
    // Oblicz rozmiar każdej paczki
    const baseBatchSize = Math.floor(tasks.length / actualBatchCount);
    const remainder = tasks.length % actualBatchCount;
    
    let currentIndex = 0;
    
    for (let i = 0; i < actualBatchCount; i++) {
        // Pierwsze 'remainder' paczek dostają po 1 dodatkowe zadanie
        const batchSize = baseBatchSize + (i < remainder ? 1 : 0);
        const batch = tasks.slice(currentIndex, currentIndex + batchSize);
        
        batches.push(batch);
        currentIndex += batchSize;
    }
    
    return batches;
}

// Wysyłanie zadań - każdy worker dostaje swoje paczki
async function sendTasksToWorkers(distribution, clientId, originalTaskParams, channel) {
    const sendPromises = [];
    
    for (const workerDist of distribution) {
        if (workerDist.tasks.length === 0) continue;
        
        const queueName = `tasks.worker_${workerDist.workerId}`;
        console.log(`[TasksDivider] Worker ${workerDist.workerId}: ${workerDist.tasks.length} tasks in ${workerDist.batches.length} batches`);
        
        // Wyślij każdą paczkę osobno
        for (let batchIndex = 0; batchIndex < workerDist.batches.length; batchIndex++) {
            const batch = workerDist.batches[batchIndex].map(task => ({
                ...task,
                clientId,
                useCustomFunction: true,
                sanitizedId: originalTaskParams.id
            }));

            const sendPromise = new Promise((resolve, reject) => {
                try {
                    const success = channel.sendToQueue(
                        queueName,
                        Buffer.from(JSON.stringify(batch)),
                        { persistent: true }
                    );
                    
                    if (success) {
                        resolve();
                    } else {
                        reject(new Error(`Failed to send batch ${batchIndex + 1} to ${queueName}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
            
            sendPromises.push(sendPromise);
        }
    }

    await Promise.all(sendPromises);
    console.log(`[TasksDivider] Successfully sent all batches to workers`);
}

module.exports = { tasksDevider3000 };