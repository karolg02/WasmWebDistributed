import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Container, Paper, Title, Divider, Text, SimpleGrid, Group, Badge, Alert, Button } from "@mantine/core";
import { useSocket } from "../hooks/useSocket";
import { TaskParams } from "../types";
import { IntegrationTaskForm } from "../components/TrapezMethod";
import { MonteCarloForm } from "../components/MonteCarloForm";
import { ResultsPanel } from "../components/ResultsPanel";
import { WorkerCard } from "../components/WorkerCard";
import { IconAlertTriangle } from "@tabler/icons-react";

export function TasksPanel() {
    const location = useLocation();
    const initialMethod = location.state?.method === 'montecarlo' ? 'montecarlo' : 'trapezoidal';
    const [currentMethod, setCurrentMethod] = useState<'trapezoidal' | 'montecarlo'>(initialMethod);
    const [error, setError] = useState<string | null>(null);

    const {
        socket, workers, selectedWorkerIds, setSelectedWorkerIds, progress, result, duration, isCalculating, startTime, queueStatus, startTask, compilingFunction, functionCompilationResultDisplay
    } = useSocket();

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
        y_max: 1.0,
        N: 100,
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
        } else {
            if (!monteCarloTaskParams.customFunction || monteCarloTaskParams.customFunction.trim() === "") {
                setError("Ciało funkcji dla metody Monte Carlo nie może być puste.");
                return;
            }
            taskResult = await startTask(monteCarloTaskParams, selectedWorkerIds);
        }

        if (taskResult && !taskResult.success) {
            setError(taskResult.error || "Wystąpił błąd podczas uruchamiania zadania");
        }
    };
    return (
        <Container size="lg" py="xl">
            <Paper withBorder shadow="md" radius="md" p="xl" bg="dark.8">
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

                {currentMethod === "trapezoidal" ? (
                    <IntegrationTaskForm
                        taskParams={trapezoidalTaskParams}
                        setTaskParams={setTrapezoidalTaskParams}
                        onSubmit={handleSubmit}
                        disabled={isCalculating || compilingFunction}
                        compilationResult={functionCompilationResultDisplay} />
                ) : (
                    <MonteCarloForm
                        taskParams={monteCarloTaskParams}
                        setTaskParams={setMonteCarloTaskParams}
                        onSubmit={handleSubmit}
                        disabled={isCalculating || compilingFunction}
                        compilationResult={functionCompilationResultDisplay} />
                )}

                <Divider my="xl" />

                <Title order={3} mb="sm" c="white">
                    <Group gap="xs">
                        <Text span>Aktywne przeglądarki</Text>
                        <Badge color="cyan" radius="sm">{workers.length}</Badge>
                    </Group>
                </Title>

                {workers.length === 0 ? (
                    <Paper withBorder p="md" radius="md" bg="dark.7">
                        <Text c="dimmed" ta="center">Brak dostępnych workerów. Otwórz stronę workera w nowej przeglądarce.</Text>
                    </Paper>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 1, md: 2 }} spacing="sm">
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

                <Divider my="xl" />

                <Title order={3} mb="xs" c="white">Wyniki</Title>
                <ResultsPanel
                    isCalculating={isCalculating}
                    progress={progress}
                    taskParams={currentMethod === "trapezoidal" ? trapezoidalTaskParams : monteCarloTaskParams}
                    startTime={startTime}
                    result={result}
                    duration={duration}
                    method={currentMethod} tasksPerSecond={null} />
            </Paper>
        </Container>
    );
}