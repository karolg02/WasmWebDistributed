#!/bin/bash

echo "🟡      Runs RabbitMQ      🟡"
sudo systemctl start rabbitmq

echo "🟡  Runs worker http 8000  🟡"
(cd worker && python3 -m http.server 8000) &
PID1=$!

trap cleanup INT

cleanup() {
    echo ""
    echo "🛑           HTTP         🛑"
    kill $PID1
    # kill $PID2

    echo "🛑        RabbitMQ        🛑"
    sudo rabbitmqctl purge_queue tasks
    sudo systemctl stop rabbitmq

    echo "🟢        Zamknięto       🟢"
    exit 0
}

echo "🟢        All good         🟢"
while true; do sleep 1; done
