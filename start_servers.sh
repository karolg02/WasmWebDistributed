#!/bin/bash

echo "🔄 Uruchamiam RabbitMQ..."
sudo systemctl start rabbitmq.service

echo "🌐 Uruchamiam serwer w public na porcie 8000..."
(cd src/public && python3 -m http.server 8000) &
PID1=$!

echo "🌐 Uruchamiam serwer w client na porcie 3000..."
(cd src/client && python3 -m http.server 3000) &
PID2=$!

trap cleanup INT

cleanup() {
    echo ""
    echo "🛑 Zatrzymuję serwery HTTP..."
    kill $PID1
    kill $PID2

    echo "🛑 Zatrzymuję RabbitMQ..."
    sudo rabbitmqctl purge_queue tasks
    sudo systemctl stop rabbitmq.service

    echo "✅ Wszystko zamknięte. Do widzenia!"
    exit 0
}

echo "✅ Wszystko działa! Naciśnij Ctrl+C, żeby zakończyć."
while true; do sleep 1; done
