async function createQueuePerClient(channel, workerId, socket) {
    const queueName = `tasks.worker_${workerId}`;
    await channel.assertQueue(queueName);

    channel.consume(queueName, (msg) => {
        if (!msg) return;
        const task = JSON.parse(msg.content.toString());
        socket.emit("task", task);
        channel.ack(msg);
    });
}
exports.createQueuePerClient = createQueuePerClient;
