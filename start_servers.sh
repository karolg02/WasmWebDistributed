#!/bin/bash

echo "🟡      Runs RabbitMQ      🟡"
sudo systemctl start rabbitmq.service

echo "🟡  Runs worker http 8000  🟡"
(cd src/public && python3 -m http.server 8000) &
PID1=$!

echo "🟡  Runs client http 3000  🟡"
(cd src/client && python3 -m http.server 3000) &
PID2=$!

trap cleanup INT

cleanup() {
    echo ""
    echo "🛑 HTTP 🛑"
    kill $PID1
    kill $PID2

    echo "🛑 RabbitMQ 🛑"
    sudo rabbitmqctl purge_queue tasks
    sudo systemctl stop rabbitmq

    echo "🟢     Zamknięto        🟢"
    exit 0
}

echo "🟢        All good         🟢"
while true; do sleep 1; done
