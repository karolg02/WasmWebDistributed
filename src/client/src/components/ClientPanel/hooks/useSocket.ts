import { useEffect, useState } from "react";
import io from "socket.io-client";
import { Worker } from "../../../types/Worker";
import { Progress, QueueStatus, TaskParams } from "../types";

const socket = io(`http://${window.location.hostname}:8080/client`);

export const useSocket = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [progress, setProgress] = useState<Progress>({ done: 0, elapsedTime: 0 });
    const [result, setResult] = useState<number | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [tasksPerSecond, setTasksPerSecond] = useState<number | null>(null);
    const [queueStatus, setQueueStatus] = useState<QueueStatus>({});

    useEffect(() => {
        socket.on("worker_update", setWorkers);
        socket.on("task_progress", (data: Progress) => {
            setProgress(data);
            setIsCalculating(true);
        });
        socket.on("final_result", (data: { sum: number; duration: number }) => {
            setResult(data.sum);
            setDuration(data.duration);
            setProgress({ done: 0, elapsedTime: 0 });
            setIsCalculating(false);
            setStartTime(null);
            setTasksPerSecond(null);
        });
        socket.on("queue_status", setQueueStatus);

        return () => {
            socket.off("worker_update");
            socket.off("task_progress");
            socket.off("final_result");
            socket.off("queue_status");
        };
    }, []);

    const startTask = (taskParams: TaskParams, workerIds: string[]) => {
        setIsCalculating(true);
        setResult(null);
        setDuration(null);
        setStartTime(Date.now());
        setTasksPerSecond(null);
        setProgress({ done: 0, elapsedTime: 0 });

        socket.emit("start", { workerIds, taskParams });
    };

    return {
        socket,
        workers,
        selectedWorkerIds,
        setSelectedWorkerIds,
        progress,
        result,
        duration,
        isCalculating,
        startTime,
        tasksPerSecond,
        queueStatus,
        startTask
    };
};