async function createTasks({ a = 0, b = Math.PI, dx = 0.000001, N = 100000 }) {
    const fragment = (b - a) / N;
    const tasks = [];

    for (let i = 0; i < N; i++) {
        const start = a + i * fragment;
        const end = start + fragment;

        tasks.push({
            type: "task",
            a: start,
            b: end,
            dx: dx,
            taskId: `task_${i}`
        });
    }

    return tasks;
}

module.exports = { createTasks };