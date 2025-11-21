const amqp = require("amqplib");

let connection = null;

async function connectToRabbitMQ() {
    const amqpHost = process.env.AMQP_HOST || '127.0.0.1';
    const maxRetries = 5;
    let retries = 0;
    let channel = null;
    
    while (retries < maxRetries) {
        try {
            connection = await amqp.connect(`amqp://${amqpHost}:5672`, {
                heartbeat: 60 // Zwiększony heartbeat timeout do 60s
            });
            
            // Handle connection errors
            connection.on('error', (err) => {
                console.error('[RabbitMQ] Connection error:', err.message);
            });
            
            connection.on('close', () => {
                console.log('[RabbitMQ] Connection closed');
            });
            
            channel = await connection.createChannel();
            
            // Set prefetch to avoid overloading
            await channel.prefetch(1);
            
            return { connection, channel };
        } catch (error) {
            console.log(`[Server] Nie udało się połączyć z RabbitMQ: ${error.message}`);
            retries++;
            if (retries < maxRetries) {
                console.log(`[Server] Ponawiam za 5 sekund...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
    throw new Error(`[Server] Nie udało się połączyć z RabbitMQ po ${maxRetries} próbach`);
}

module.exports = { connectToRabbitMQ };