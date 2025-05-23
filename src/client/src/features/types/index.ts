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

export interface CustomParams1D {
    method: 'custom';
    x1: number;
    x2: number;
    dx: number;
    N: number;
    wasmSource: string; // Renamed from customFunction
    sanitizedId?: string;
}

export type AllTaskParams = TaskParams | CustomParams1D;

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