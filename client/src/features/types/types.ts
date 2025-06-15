export interface CustomParams1D {
    method: 'custom1D';
    params: number[];
    sanitizedId?: string;
}

export interface CustomParams2D {
    method: 'custom2D';
    params: number[];
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
        isCalculating: boolean;
    };
}

export interface WorkerStatus {
    message: string;
    color: string;
    badge: string | null;
}