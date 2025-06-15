import { Channel, Message } from 'amqplib';
import { Socket } from 'socket.io';

export async function createQueuePerClient(channel: Channel, workerId: string, socket: Socket): Promise<void> {
    const queueName = `tasks.worker_${workerId}`;
    await channel.assertQueue(queueName);

    channel.consume(queueName, (msg: Message | null) => {
        if (msg !== null) {
            const batch = JSON.parse(msg.content.toString());
            socket.emit("task_batch", batch);
            channel.ack(msg);
        }
    });
}