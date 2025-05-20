export interface TaskParams {
    method: 'trapezoidal' | 'montecarlo';
    a: number;
    b: number;
    dx?: number;
    N: number;
    samples?: number;
    y_max?: number;
    customFunction: string;
    sanitizedId?: string;
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