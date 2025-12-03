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
    const [error, setError] = useState<string | null>(null);

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
            setError(null);
        };
        const onFinalResult = (data: { result: number; duration: number; error?: string }) => {
            setResult(data.result);
            setDuration(data.duration);
            setIsCalculating(false);
            if (data.error) {
                setError(data.error);
            }
        };
        const onQueueStatus = (data: QueueStatus) => setQueueStatus(data);
        const onTaskError = (data: { message: string; workerId?: string; type?: string }) => {
            console.error("Task error:", data);
            setError(data.message);
            setIsCalculating(false);
        };

        socket.on("worker_update", onWorkerUpdate);
        socket.on("task_progress", onTaskProgress);
        socket.on("final_result", onFinalResult);
        socket.on("queue_status", onQueueStatus);
        socket.on("task_error", onTaskError);

        return () => {
            socket.off("worker_update", onWorkerUpdate);
            socket.off("task_progress", onTaskProgress);
            socket.off("final_result", onFinalResult);
            socket.off("queue_status", onQueueStatus);
            socket.off("task_error", onTaskError);
        };
    }, [socket, location.pathname, navigate]);

    const startTask = async (taskParams: AllTaskParams, workerIds: string[]) => {
        setIsCalculating(true);
        setResult(null);
        setDuration(null);
        setStartTime(Date.now());
        setTasksPerSecond(null);
        setProgress({ done: 0, elapsedTime: 0 });
        setError(null);

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
        startTask,
        error
    };
};

export { useSocketContext };