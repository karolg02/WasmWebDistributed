export interface TaskParams {
    method: string;
    params: number[];
    sanitizedId?: string;
}

export interface Custom1DTaskParams extends TaskParams {
    method: 'custom1D';
    params: [number, number, number, ...number[]];
}

export interface Custom2DTaskParams extends TaskParams {
    method: 'custom2D';
    params: [number, number, number, number, number, ...number[]];
}

export type AllTaskParams = Custom1DTaskParams | Custom2DTaskParams;

export interface Task {
    taskId: number;
    method: string;
    a: number;
    b: number;
    c?: number;
    d?: number;
    paramsArray: number[];
    clientId?: string;
    useCustomFunction?: boolean;
    sanitizedId?: string;
}

export interface WorkerInfo {
    socket: any;
    name: string;
    benchmarkScore: number;
    specs: {
        platform: string;
        userAgent: string;
        language: string;
        hardwareConcurrency: number;
        deviceMemory: string | number;
    };
    performance: {
        benchmarkScore: number;
        latency: number;
    };
}

export interface ClientState {
    expected: number;
    completed: number;
    sum: number;
    start: number;
    lastUpdate: number;
    method: string;
    totalSamples: number | null;
}

export interface ClientTask {
    socket: any;
    workerIds: string[];
}

export interface WaitingClient {
    socket: any;
    workerIds: string[];
    tasks: Task[];
    taskParams: AllTaskParams;
}

export interface ActiveCustomFunction {
    active: boolean;
    sanitizedId: string;
}