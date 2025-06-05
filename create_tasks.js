async function createTasks(params) {
    if (params.method === 'custom1D') {
        return createCustom1DTasks(params);
    } else if (params.method === 'custom2D') {
        return createCustom2DTasks(params);
    }

    // Fallback dla starych metod jeśli nadal potrzebne
    return [];
}

async function createCustom1DTasks(params) {
    const { x1 = 0, x2 = 1, dx = 0.00001, N = 100000 } = params;
    const fragment = (x2 - x1) / N;
    const tasks = [];

    for (let i = 0; i < N; i++) {
        const start = x1 + i * fragment;
        const end = start + fragment;

        tasks.push({
            type: "task",
            method: "custom1D",
            a: start,
            b: end,
            dx: dx,
            taskId: `custom1D_task_${i}`
        });
    }

    return tasks;
}

async function createCustom2DTasks(params) {
    const { x1 = 0, x2 = 1, y1 = 0, y2 = 1, dx = 0.001, dy = 0.001, N = 100000 } = params;
    const tasks = [];
    const totalArea = (x2 - x1) * (y2 - y1);

    // Przybliżona liczba segmentów w każdym wymiarze
    const segmentsPerDim = Math.ceil(Math.sqrt(N));
    const xStep = (x2 - x1) / segmentsPerDim;
    const yStep = (y2 - y1) / segmentsPerDim;

    let taskId = 0;
    for (let i = 0; i < segmentsPerDim && taskId < N; i++) {
        for (let j = 0; j < segmentsPerDim && taskId < N; j++) {
            const xStart = x1 + i * xStep;
            const xEnd = Math.min(x1 + (i + 1) * xStep, x2);
            const yStart = y1 + j * yStep;
            const yEnd = Math.min(y1 + (j + 1) * yStep, y2);

            tasks.push({
                type: "task",
                method: "custom2D",
                a: xStart,
                b: xEnd,
                c: yStart,
                d: yEnd,
                dx: dx,
                dy: dy,
                taskId: `custom2D_task_${taskId}`
            });
            taskId++;
        }
    }

    return tasks;
}

module.exports = { createTasks };