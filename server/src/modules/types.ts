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