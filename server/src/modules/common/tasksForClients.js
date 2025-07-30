async function tryToGiveTasksForWaitingClients(
    waitingClients, workerLocks, workerQueue, clientTasks, clientStates, workers, channel, tasksDevider3000
) {
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
            results: [],
            start: 0,
            lastUpdate: 0,
            method: pending.taskParams.method,
            totalSamples: pending.taskParams.method === 'custom1D' || pending.taskParams.method === 'custom2D' ? null : pending.taskParams.samples
        });
        await tasksDevider3000(pending.tasks, clientId, pending.workerIds, pending.taskParams, workers, channel);
    }
}

module.exports = { tryToGiveTasksForWaitingClients };