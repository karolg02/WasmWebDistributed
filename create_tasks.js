async function createTasks(taskParams) {
    if (taskParams.method === "custom1D") {
        return createCustom1DTasks(taskParams);
    } else if (taskParams.method === "custom2D") {
        return createCustom2DTasks(taskParams);
    }
    throw new Error(`Unknown method: ${taskParams.method}`);
}

function createCustom1DTasks(taskParams) {
    const [x1, x2, N, dx, ...additionalParams] = taskParams.params;
    const fragment = (x2 - x1) / N;
    const tasks = [];

    for (let i = 0; i < N; i++) {
        const a = x1 + i * fragment;
        const b = a + fragment;

        tasks.push({
            taskId: i,
            method: taskParams.method,
            a: a,
            b: b,
            dx: dx,
            paramsArray: [a, b, dx, ...additionalParams]
        });
    }
    return tasks;
}

function createCustom2DTasks(taskParams) {
    const [x1, x2, y1, y2, N, dx, dy, ...additionalParams] = taskParams.params;

    const nx = Math.ceil(Math.sqrt(N));
    const ny = Math.ceil(N / nx);

    const fragmentX = (x2 - x1) / nx;
    const fragmentY = (y2 - y1) / ny;

    const tasks = [];
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
                dx: dx,
                dy: dy,
                paramsArray: [a, b, c, d, dx, dy, taskId, ...additionalParams]
            });
            taskId++;
        }
    }
    return tasks;
}

module.exports = { createTasks };