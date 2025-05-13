async function createTasks(params) {
    const { a = 0, b = Math.PI, N = 100000 } = params;
    
    // Determine which method to use
    if (params.method === 'montecarlo') {
        const { samples = 10000, y_max = 1 } = params;
        return createMonteCarloTasks({ a, b, samples, y_max, N });
    } else {
        // Default to trapezoidal method
        const { dx = 0.000001 } = params;
        return createTrapezoidalTasks({ a, b, dx, N });
    }
}

async function createTrapezoidalTasks({ a = 0, b = Math.PI, dx = 0.000001, N = 100000 }) {
    const fragment = (b - a) / N;
    const tasks = [];

    for (let i = 0; i < N; i++) {
        const start = a + i * fragment;
        const end = start + fragment;

        tasks.push({
            type: "task",
            method: "trapezoidal",
            a: start,
            b: end,
            dx: dx,
            taskId: `trap_task_${i}`
        });
    }

    return tasks;
}

async function createMonteCarloTasks({ a = 0, b = Math.PI, samples = 10000, y_max = 1, N = 100 }) {
    const tasks = [];
    
    // Split the total samples among N tasks
    const samplesPerTask = Math.floor(samples / N);
    
    for (let i = 0; i < N; i++) {
        tasks.push({
            type: "task",
            method: "montecarlo",
            a: a,
            b: b,
            samples: samplesPerTask,
            y_max: y_max,
            taskId: `mc_task_${i}`,
            seedOffset: i  // Add this to ensure unique random sequences
        });
    }
    
    return tasks;
}

module.exports = { createTasks };