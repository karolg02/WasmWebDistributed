const amqp = require("amqplib");

async function createTasks() {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    const queue = "tasks";

    await channel.assertQueue(queue);

    for (let i = 0; i < 100000; i++) {
        const a = Math.floor(Math.random() * 10);
        const b = Math.floor(Math.random() * 10);
        const task = { type: "task", a, b, taskId: `task_${i}` };
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(task)));
    }
    console.log("Dodano zadania");

    //closing channel and later clossing connection
    await channel.close();
    await connection.close();
}

createTasks();