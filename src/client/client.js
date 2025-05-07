const socket = io(`http://${window.location.hostname}:8080/client`);

const startButton = document.getElementById("start");
const workerList = document.getElementById("workerList");

startButton.addEventListener("click", () => {
    const selectedWorkerIds = Array.from(
        workerList.querySelectorAll("input[type='checkbox']:checked")
    ).map(cb => cb.value);

    if (selectedWorkerIds.length === 0) {
        alert("Wybierz co najmniej jednego workera!");
        return;
    }

    socket.emit("start", { workerIds: selectedWorkerIds });
});

socket.on("worker_update", (workers) => {
    workerList.innerHTML = "";

    workers.forEach(({ id, name }) => {
        const li = document.createElement("li");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = id;
        checkbox.id = `worker-${id}`;

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.innerText = name || id;

        li.appendChild(checkbox);
        li.appendChild(label);
        workerList.appendChild(li);
    });
});

// socket.on("task_progress", ({ done, total }) => {
//     document.getElementById("progress").textContent = `${done} / ${total}`;
// });

socket.on("final_result", (data) => {
    console.log("Otrzymano final_result z serwera");
    document.getElementById("global-result").textContent = data.sum.toFixed(6);
    document.getElementById("duration").textContent = data.duration;
});