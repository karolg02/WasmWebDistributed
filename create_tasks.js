async function createTasks() {
    const start = 0;
    const koniec = Math.PI;
    const dx = 0.000001;
    const N = 100000;

    const fragment = (koniec - start) / N;

    const tasks = [];

    for (let i = 0; i < N; i++) {
        const a = start + i * fragment;
        const b = a + fragment;
        const task = {
            type: "task",
            a: a,
            b: b,
            dx: dx,
            taskId: `task_${i}`
        };
        tasks.push(task);
    }
    return tasks;
}

module.exports = { createTasks };