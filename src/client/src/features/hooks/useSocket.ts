import { useEffect, useState } from "react";
import io from "socket.io-client";
import { Worker } from "../types/Worker"; // Assuming Worker type is defined
import { Progress, QueueStatus, TaskParams, AllTaskParams, CustomParams1D } from "../types"; // Added AllTaskParams and CustomParams1D

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

    const startTask = async (taskParams: AllTaskParams, workerIds: string[]) => {
        setIsCalculating(true);
        setResult(null);
        setDuration(null);
        setStartTime(Date.now());
        setTasksPerSecond(null);
        setProgress({ done: 0, elapsedTime: 0 });
        setFunctionCompilationResultDisplay(null);

        let mutableTaskParams: AllTaskParams = { ...taskParams };

        if (mutableTaskParams.method === 'trapezoidal' || mutableTaskParams.method === 'montecarlo') {
            const specificTaskParams = mutableTaskParams as TaskParams;
            if (!specificTaskParams.customFunction || specificTaskParams.customFunction.trim() === "") {
                setIsCalculating(false);
                const errorMsg = "Ciało funkcji nie może być puste.";
                setFunctionCompilationResultDisplay({ success: false, error: errorMsg });
                return { success: false, error: errorMsg };
            }

            setCompilingFunction(true);
            try {
                socket.emit("submit_custom_function", {
                    functionCode: specificTaskParams.customFunction,
                    method: specificTaskParams.method
                });

                const compilationResult = await new Promise<any>((resolve) => {
                    socket.once("custom_function_result", resolve);
                });

                setFunctionCompilationResultDisplay(compilationResult);

                if (!compilationResult.success) {
                    setCompilingFunction(false);
                    setIsCalculating(false);
                    const { sanitizedId, ...restParams } = specificTaskParams;
                    mutableTaskParams = restParams as TaskParams;
                    return { success: false, error: compilationResult.error || "Function compilation failed" };
                }
                mutableTaskParams = { ...specificTaskParams, sanitizedId: compilationResult.sanitizedId };

            } catch (error) {
                setCompilingFunction(false);
                setIsCalculating(false);
                const { sanitizedId, ...restParams } = specificTaskParams;
                mutableTaskParams = restParams as TaskParams;
                const errorMessage = error instanceof Error ? error.message : "Failed to compile function";
                setFunctionCompilationResultDisplay({ success: false, error: errorMessage });
                return { success: false, error: errorMessage };
            }
            setCompilingFunction(false);
        }
        else if (mutableTaskParams.method === 'custom') {
            const specificTaskParams = mutableTaskParams as CustomParams1D;
            if (!specificTaskParams.wasmSource || specificTaskParams.wasmSource.trim() === "") {
                setIsCalculating(false);
                const errorMsg = "Kod WASM lub identyfikator funkcji dla metody własnej nie może być pusty.";
                setFunctionCompilationResultDisplay({ success: false, error: errorMsg });
                return { success: false, error: errorMsg };
            }
        }

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