import { TaskParams, Custom1DTaskParams, Custom2DTaskParams, AllTaskParams, Task } from './types';

export async function createTasks(taskParams: AllTaskParams): Promise<Task[]> {
    switch (taskParams.method) {
        case "custom1D":
            return createCustom1DTasks(taskParams);
        case "custom2D":
            return createCustom2DTasks(taskParams);
        default:
            // Używamy type assertion lub sprawdzamy methodę jako string
            const exhaustiveCheck: never = taskParams;
            throw new Error(`Unknown method: ${(taskParams as any).method}`);
    }
}

function createCustom1DTasks(taskParams: Custom1DTaskParams): Task[] {
    const [x1, x2, N, ...additionalParams] = taskParams.params;
    const fragment = (x2 - x1) / N;
    const tasks: Task[] = [];

    for (let i = 0; i < N; i++) {
        const a = x1 + i * fragment;
        const b = a + fragment;

        tasks.push({
            taskId: i,
            method: taskParams.method,
            a: a,
            b: b,
            paramsArray: [a, b, ...additionalParams]
        });
    }
    return tasks;
}

function createCustom2DTasks(taskParams: Custom2DTaskParams): Task[] {
    const [x1, x2, y1, y2, N, ...additionalParams] = taskParams.params;

    const nx = Math.ceil(Math.sqrt(N));
    const ny = Math.ceil(N / nx);

    const fragmentX = (x2 - x1) / nx;
    const fragmentY = (y2 - y1) / ny;

    const tasks: Task[] = [];
    let taskId = 0;

    for (let i = 0; i < nx && taskId < N; i++) {
        for (let j = 0; j < ny && taskId < N; j++) {
            const a = x1 + i * fragmentX;
            const b = a + fragmentX;
            const c = y1 + j * fragmentY;
            const d = c + fragmentY;

            tasks.push({
                taskId: taskId,
                method: taskParams.method,
                a: a,
                b: b,
                c: c,
                d: d,
                paramsArray: [a, b, c, d, ...additionalParams]
            });
            taskId++;
        }
    }
    return tasks;
}