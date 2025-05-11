import { QueueStatus, WorkerStatus } from "../types/index";

export const getWorkerStatus = (
    workerStatus: QueueStatus[string],
    isCurrentClient: boolean
): WorkerStatus => {
    if (isCurrentClient) {
        return {
            message: "Wykonuje twoje zadanie",
            color: "green",
            badge: null
        };
    }

    if (workerStatus?.currentClient) {
        return {
            message: "Zajęty",
            color: "red",
            badge: `W kolejce: ${workerStatus.queueLength}`
        };
    }

    return {
        message: "Dostępny",
        color: "green",
        badge: workerStatus?.queueLength > 0 ? `W kolejce: ${workerStatus.queueLength}` : null
    };
};