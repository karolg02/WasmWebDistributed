export interface CustomParams1D {
    method: 'custom1D';
    x1: number;
    x2: number;
    dx: number;
    N: number;
    wasmSource: string;
    sanitizedId?: string;
}

export interface CustomParams2D {
    method: 'custom2D';
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    dx: number;
    dy: number;
    N: number;
    wasmSource: string;
    sanitizedId?: string;
}

export type AllTaskParams = CustomParams1D | CustomParams2D;

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