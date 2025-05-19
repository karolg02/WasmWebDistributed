import { useEffect, useState } from "react";
import io from "socket.io-client";
import { Worker } from "../types/Worker"; // Assuming Worker type is defined
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
    const [compilingFunction, setCompilingFunction] = useState(false);
    const [functionCompilationResultDisplay, setFunctionCompilationResultDisplay] = useState<{ success: boolean, message?: string, error?: string } | null>(null);


    useEffect(() => {
        socket.on("worker_update", setWorkers);
        socket.on("task_progress", (data: Progress) => {
            setProgress(data);
            setIsCalculating(true);
        });
        socket.on("final_result", (data: { sum: number; duration: number }) => {
            setResult(data.sum);
            setDuration(data.duration);
            setIsCalculating(false);
        });
        socket.on("queue_status", setQueueStatus);

        return () => {
            socket.off("worker_update");
            socket.off("task_progress");
            socket.off("final_result");
            socket.off("queue_status");
        };
    }, []);

    const startTask = async (taskParams: TaskParams, workerIds: string[]) => {
        setIsCalculating(true);
        setResult(null);
        setDuration(null);
        setStartTime(Date.now());
        setTasksPerSecond(null);
        setProgress({ done: 0, elapsedTime: 0 });
        setFunctionCompilationResultDisplay(null);

        const mutableTaskParams = { ...taskParams };
        if (!mutableTaskParams.customFunction || mutableTaskParams.customFunction.trim() === "") {
            setIsCalculating(false);
            setFunctionCompilationResultDisplay({ success: false, error: "Ciało funkcji nie może być puste." });
            return { success: false, error: "Ciało funkcji nie może być puste." };
        }

        setCompilingFunction(true);
        try {
            socket.emit("submit_custom_function", {
                functionCode: mutableTaskParams.customFunction
            });

            const compilationResult = await new Promise<any>((resolve) => {
                socket.once("custom_function_result", resolve);
            });

            setFunctionCompilationResultDisplay(compilationResult);

            if (!compilationResult.success) {
                setCompilingFunction(false);
                setIsCalculating(false);
                delete mutableTaskParams.sanitizedId;
                return { success: false, error: compilationResult.error || "Function compilation failed" };
            }
            mutableTaskParams.sanitizedId = compilationResult.sanitizedId;

        } catch (error) {
            setCompilingFunction(false);
            setIsCalculating(false);
            delete mutableTaskParams.sanitizedId;
            const errorMessage = error instanceof Error ? error.message : "Failed to compile function";
            setFunctionCompilationResultDisplay({ success: false, error: errorMessage });
            return { success: false, error: errorMessage };
        }
        setCompilingFunction(false);
        socket.emit("start", { workerIds, taskParams: mutableTaskParams });
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
        compilingFunction,
        functionCompilationResultDisplay
    };
};