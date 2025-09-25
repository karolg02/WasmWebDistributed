import { useEffect, useState } from "react";
import { useSocketContext } from "../../context/Socket";
import { Worker } from "../types/Worker";
import { Progress, QueueStatus, AllTaskParams } from "../types/types";
import { useNavigate, useLocation } from "react-router-dom";

export const useSocket = () => {
    const socket = useSocketContext();
    const navigate = useNavigate();
    const location = useLocation();

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
        const token = localStorage.getItem('token');
        const authPaths = ['/login', '/register'];
        if (!token && !authPaths.includes(location.pathname)) {
            navigate('/login', { replace: true });
            return;
        }

        if (!socket) return;

        const onWorkerUpdate = (data: Worker[]) => setWorkers(Array.isArray(data) ? data : []);
        const onTaskProgress = (data: Progress & { total?: number }) => {
            setProgress(data);
            setIsCalculating(true);
        };
        const onFinalResult = (data: { result: number; duration: number }) => {
            setResult(data.result);
            setDuration(data.duration);
            setIsCalculating(false);
        };
        const onQueueStatus = (data: QueueStatus) => setQueueStatus(data);

        socket.on("worker_update", onWorkerUpdate);
        socket.on("task_progress", onTaskProgress);
        socket.on("final_result", onFinalResult);
        socket.on("queue_status", onQueueStatus);

        return () => {
            socket.off("worker_update", onWorkerUpdate);
            socket.off("task_progress", onTaskProgress);
            socket.off("final_result", onFinalResult);
            socket.off("queue_status", onQueueStatus);
        };
    }, [socket, location.pathname, navigate]);

    const startTask = async (taskParams: AllTaskParams, workerIds: string[]) => {
        setIsCalculating(true);
        setResult(null);
        setDuration(null);
        setStartTime(Date.now());
        setTasksPerSecond(null);
        setProgress({ done: 0, elapsedTime: 0 });

        if (!socket) {
            return { success: false, error: 'no_socket' };
        }

        socket.emit("start", { workerIds, taskParams });
        return { success: true };
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

export { useSocketContext };