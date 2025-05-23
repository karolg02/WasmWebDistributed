import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Container, Paper, Title, Text, SimpleGrid, Group, Badge, Alert } from "@mantine/core";
import { useSocket } from "../hooks/useSocket";
import { AllTaskParams, CustomParams1D, TaskParams } from "../types";
import { IntegrationTaskForm } from "../components/methods/TrapezMethod";
import { MonteCarloForm } from "../components/methods/MonteCarloForm";
import { ResultsPanel } from "../components/ResultsPanel";
import { WorkerCard } from "../components/WorkerCard";
import { IconAlertTriangle } from "@tabler/icons-react";
import { CustomForm } from "../components/methods/CustomForm";

export function TasksPanel() {
    const location = useLocation();
    const initialMethod =
        location.state?.method === 'montecarlo'
            ? 'montecarlo'
            : location.state?.method === 'custom'
                ? 'custom'
                : 'trapezoidal';

    const [currentMethod] = useState<'trapezoidal' | 'montecarlo' | 'custom'>(initialMethod);

    const [error, setError] = useState<string | null>(null);

    const {
        socket, workers, selectedWorkerIds, setSelectedWorkerIds, progress, result, duration, isCalculating, startTime, queueStatus, startTask, compilingFunction, functionCompilationResultDisplay
    } = useSocket();

    const [customParams1D, setCustomParams1D] = useState<CustomParams1D>({
        method: 'custom',
        x1: 0,
        x2: 1,
        dx: 0.00001,
        N: 100000,
        wasmSource: "" // Renamed from customFunction
    });

    const [trapezoidalTaskParams, setTrapezoidalTaskParams] = useState<TaskParams>({
        method: 'trapezoidal',
        a: 0,
        b: 3.14159,
        dx: 0.00001,
        N: 100000,
        customFunction: ""
    });

    const [monteCarloTaskParams, setMonteCarloTaskParams] = useState<TaskParams>({
        method: 'montecarlo',
        a: 0,
        b: Math.PI,
        samples: 10000,
        N: 10000,
        customFunction: ""
    });

    useEffect(() => {
        if (socket) {
            socket.emit("request_worker_list");
        }
    }, [socket]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (selectedWorkerIds.length === 0) {
            setError("Wybierz co najmniej jednego workera!");
            return;
        }

        let taskResult;
        if (currentMethod === "trapezoidal") {
            if (!trapezoidalTaskParams.customFunction || trapezoidalTaskParams.customFunction.trim() === "") {
                setError("Ciało funkcji dla metody trapezów nie może być puste.");
                return;
            }
            taskResult = await startTask(trapezoidalTaskParams, selectedWorkerIds);
        } else if (currentMethod === "montecarlo") {
            if (!monteCarloTaskParams.customFunction || monteCarloTaskParams.customFunction.trim() === "") {
                setError("Ciało funkcji dla metody Monte Carlo nie może być puste.");
                return;
            }
            taskResult = await startTask(monteCarloTaskParams, selectedWorkerIds);
        } else if (currentMethod === "custom") {
            if (!customParams1D.wasmSource || customParams1D.wasmSource.trim() === "") {
                setError("Kod WASM lub identyfikator funkcji dla metody własnej nie może być pusty.");
                return;
            }
            // Assuming startTask can handle CustomParams1D.
            // You might need to adjust startTask in useSocket.ts
            taskResult = await startTask(customParams1D as AllTaskParams, selectedWorkerIds);
        }

        if (taskResult && !taskResult.success) {
            setError(taskResult.error || "Wystąpił błąd podczas uruchamiania zadania");
        }
    };

    const getCurrentTaskParams = (): AllTaskParams => {
        switch (currentMethod) {
            case "trapezoidal":
                return trapezoidalTaskParams;
            case "montecarlo":
                return monteCarloTaskParams;
            case "custom":
                return customParams1D;
            default:
                // Fallback, though currentMethod is typed and should match one of the cases
                return trapezoidalTaskParams;
        }
    };

    return (
        <Container size="lg" py="xl">
            <Paper bg="dark.8">
                {error && (
                    <Alert
                        icon={<IconAlertTriangle size={16} />}
                        title="Błąd"
                        color="red"
                        mb="md"
                        withCloseButton
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                {/* This top-level conditional rendering of forms might need adjustment
                    if you want a single form that changes dynamically.
                    The IIFE below already handles this, so one of these might be redundant
                    or could be refactored. For now, let's assume the IIFE is the primary one.
                 */}
                {/* {currentMethod === "trapezoidal" ? (
                    <IntegrationTaskForm
                        taskParams={trapezoidalTaskParams}
                        setTaskParams={setTrapezoidalTaskParams}
                        onSubmit={handleSubmit}
                        disabled={isCalculating || compilingFunction}
                        compilationResult={functionCompilationResultDisplay} />
                ) : currentMethod === "montecarlo" ? ( // Added currentMethod check
                    <MonteCarloForm
                        taskParams={monteCarloTaskParams}
                        setTaskParams={setMonteCarloTaskParams}
                        onSubmit={handleSubmit}
                        disabled={isCalculating || compilingFunction}
                        compilationResult={functionCompilationResultDisplay} />
                ) : ( // Assumes custom if not trapezoidal or montecarlo
                    <CustomForm
                        taskParams={customParams1D}
                        setTaskParams={setCustomParams1D}
                        onSubmit={handleSubmit}
                        disabled={isCalculating || compilingFunction}
                        // compilationResult={functionCompilationResultDisplay} // Decide if/how compilation feedback applies to custom WASM
                    />
                } */}

                {(() => {
                    switch (currentMethod) {
                        case "trapezoidal":
                            return (
                                <IntegrationTaskForm
                                    taskParams={trapezoidalTaskParams}
                                    setTaskParams={setTrapezoidalTaskParams}
                                    onSubmit={handleSubmit}
                                    disabled={isCalculating || compilingFunction}
                                    compilationResult={functionCompilationResultDisplay}
                                />
                            );
                        case "montecarlo":
                            return (
                                <MonteCarloForm
                                    taskParams={monteCarloTaskParams}
                                    setTaskParams={setMonteCarloTaskParams}
                                    onSubmit={handleSubmit}
                                    disabled={isCalculating || compilingFunction}
                                    compilationResult={functionCompilationResultDisplay}
                                />
                            );
                        case "custom":
                            return (
                                <CustomForm
                                    taskParams={customParams1D}
                                    setTaskParams={setCustomParams1D}
                                    onSubmit={handleSubmit}
                                    disabled={isCalculating || compilingFunction}
                                // compilationResult={functionCompilationResultDisplay} // Consider if this is needed for custom WASM
                                />
                            );
                    }
                })()}

                <Title order={3} mt="lg" mb="sm" c="white">
                    <Group gap="xs">
                        <Text span>Aktywne przeglądarki</Text>
                        <Badge color="#7950f2" radius="sm">{workers.length}</Badge>
                    </Group>
                </Title>

                {workers.length === 0 ? (
                    <Paper withBorder p="md" radius="md" bg="dark.7">
                        <Text c="dimmed" ta="center">Brak dostępnych workerów. Otwórz stronę workera w nowej przeglądarce.</Text>
                    </Paper>
                ) : (
                    <SimpleGrid cols={{ base: 2, xs: 1, sm: 2, md: 2 }} spacing="sm" mb="sm">
                        {workers.map(worker => {
                            const isSelected = selectedWorkerIds.includes(worker.id);
                            const workerQueueStatus = queueStatus ? queueStatus[worker.id] : null;
                            const isCurrentClient = workerQueueStatus?.currentClient === socket?.id;

                            return (
                                <WorkerCard
                                    key={worker.id}
                                    worker={worker}
                                    selected={isSelected}
                                    isCurrentClient={isCurrentClient}
                                    queueStatus={workerQueueStatus}
                                    onSelect={() => {
                                        if (isCalculating || compilingFunction) return;
                                        if (isSelected) {
                                            setSelectedWorkerIds(prev => prev.filter(id => id !== worker.id));
                                        } else {
                                            setSelectedWorkerIds(prev => [...prev, worker.id]);
                                        }
                                    }} />
                            );
                        })}
                    </SimpleGrid>
                )}

                <ResultsPanel
                    isCalculating={isCalculating}
                    progress={progress}
                    taskParams={getCurrentTaskParams()}
                    startTime={startTime}
                    result={result}
                    duration={duration}
                    method={currentMethod} tasksPerSecond={null} />
            </Paper>
        </Container>
    );
}