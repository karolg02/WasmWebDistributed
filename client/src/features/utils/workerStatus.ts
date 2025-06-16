import { QueueStatus, WorkerStatus } from "../types/types";

export const getWorkerStatus = (
    queueStatus: QueueStatus[string],
    isCurrentClient: boolean
): WorkerStatus => {
    console.log('[getWorkerStatus]', { queueStatus, isCurrentClient });

    if (isCurrentClient && queueStatus?.currentClient) {
        return {
            message: "Wykonuje twoje zadanie",
            color: "green",
            badge: queueStatus.isCalculating ? "Oblicza" : null
        };
    }

    if (queueStatus?.currentClient && !isCurrentClient) {
        return {
            message: "Zajęty",
            color: "red",
            badge: queueStatus.isCalculating ? "Oblicza" : `Kolejka: ${queueStatus.queueLength}`
        };
    }

    if (queueStatus && queueStatus.queueLength > 0) {
        return {
            message: "W kolejce",
            color: "orange",
            badge: `${queueStatus.queueLength}`
        };
    }

    if (queueStatus?.isAvailable !== false) {
        return {
            message: "Dostępny",
            color: "green",
            badge: null
        };
    }

    return {
        message: "Niedostępny",
        color: "gray",
        badge: null
    };
};