const amqp = require("amqplib");

async function createTasks() {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    const queue = "tasks";

    await channel.assertQueue(queue);

    const start = 0;
    const koniec = Math.PI;
    const dx = 0.000001;
    const N = 100000;

    const fragment = (koniec - start) / N;

    for (let i = 0; i < N; i++) {
        const a = start + i * fragment;
        const b = a + fragment;
        const task = {
            type: "task",
            a: a,
            b: b,
            dx: dx,
            taskId: `task_${i}`
        }
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(task)));
    }

    console.log("Dodano zadania");

    //closing channel and later clossing connection
    await channel.close();
    await connection.close();
}

module.exports = { createTasks };