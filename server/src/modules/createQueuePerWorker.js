async function createQueuePerClient(channel, workerId, socket) {
    const queueName = `tasks.worker_${workerId}`;
    await channel.assertQueue(queueName);

    channel.consume(queueName, (msg) => {
        if (msg !== null) {
            const batch = JSON.parse(msg.content.toString());
            socket.emit("task_batch", batch);
            channel.ack(msg);
        }
    });
}
exports.createQueuePerClient = createQueuePerClient;
