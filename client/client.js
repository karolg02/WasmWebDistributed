const socket = io("http://localhost:8080/client");

document.getElementById("start").addEventListener("click", () => {
    socket.emit("start");
});

socket.on("worker_update", (workerIds) => {
    const ul = document.getElementById("workerList");
    ul.innerHTML = "";

    workerIds.forEach((id) => {
        const li = document.createElement("li");
        li.textContent = `Worker: ${id}`;
        ul.appendChild(li);
    });
});