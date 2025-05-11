export interface TaskParams {
    a: number;
    b: number;
    dx: number;
    N: number;
}

export interface Progress {
    done: number;
    elapsedTime: number;
}

export interface QueueStatus {
    [workerId: string]: {
        queueLength: number;
        currentClient: string | null;
        isAvailable: boolean;
    };
}

export interface WorkerStatus {
    message: string;
    color: string;
    badge: string | null;
}