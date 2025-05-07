#!/bin/bash

sudo ufw allow 3000
sudo ufw allow 8000
sudo ufw allow 8080
sudo ufw allow 8090

echo "🟡      Runs RabbitMQ      🟡"
sudo systemctl start rabbitmq

echo "🟡  Runs worker http 8000  🟡"
(cd src/worker && python3 -m http.server 8000 --bind 0.0.0.0) &
PID1=$!

echo "🟡  Runs client http 3000  🟡"
(cd src/client && python3 -m http.server 3000 --bind 0.0.0.0) &
PID2=$!

trap cleanup INT

cleanup() {
    echo ""
    echo "🛑 HTTP 🛑"
    kill $PID1
    kill $PID2

    sudo ufw delete allow 3000
    sudo ufw delete allow 8000
    sudo ufw delete allow 8080
    sudo ufw delete allow 8090

    echo "🛑 RabbitMQ 🛑"
    sudo rabbitmqctl purge_queue tasks
    sudo systemctl stop rabbitmq

    echo "🟢     Zamknięto        🟢"
    exit 0
}

echo "🟢        All good         🟢"
while true; do sleep 1; done
