import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Container, Paper, Title, Divider, Text, Checkbox, SimpleGrid, Group, Badge } from "@mantine/core";
import { useSocket } from "../hooks/useSocket";
import { TaskParams } from "../types";
import { TaskForm } from "../components/TrapezMethod";
import { MonteCarloForm } from "../components/MonteCarloForm";
import { ResultsPanel } from "../components/ResultsPanel";
import { WorkerCard } from "../components/WorkerCard";

// Add new type for Monte Carlo
interface MonteCarloParams {
    a: number;
    b: number;
    samples: number;
    y_max: number;
    N: number;
}

export const ClientPanel: React.FC = () => {
    const location = useLocation();
    const method = location.state?.method || "trapezoidal";

    const {
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
    } = useSocket();

    // State for trapezoidal method
    const [taskParams, setTaskParams] = useState<TaskParams>({
        a: 0,
        b: 3.14,
        dx: 0.00001,
        N: 100000,
    });

    // State for Monte Carlo method
    const [monteCarloParams, setMonteCarloParams] = useState<MonteCarloParams>({
        a: 0,
        b: Math.PI,
        samples: 10000,
        y_max: 1,
        N: 100
    });

    useEffect(() => {
        if (socket) {
            socket.emit("request_worker_list");
        }
    }, [socket]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedWorkerIds.length === 0) {
            alert("Wybierz co najmniej jednego workera!");
            return;
        }

        if (method === "trapezoidal") {
            startTask(taskParams, selectedWorkerIds);
        } else {
            socket.emit("start", {
                workerIds: selectedWorkerIds,
                taskParams: {
                    ...monteCarloParams,
                    method: "montecarlo"
                }
            });
        }
    };

    return (
        <Container size="md" py="xl">
            <Paper withBorder shadow="md" radius="md" p="xl" bg="dark.8">
                <Title order={2} mb="md" c="cyan">Panel Klienta</Title>
                <Divider my="md" />

                {method === "trapezoidal" ? (
                    <TaskForm
                        taskParams={taskParams}
                        setTaskParams={setTaskParams}
                        onSubmit={handleSubmit}
                        disabled={isCalculating}
                    />
                ) : (
                    <MonteCarloForm
                        taskParams={monteCarloParams}
                        setTaskParams={setMonteCarloParams}
                        onSubmit={handleSubmit}
                        disabled={isCalculating}
                    />
                )}

                <Divider my="xl" />

                <Title order={3} mb="sm" c="white">
                    <Group gap="xs">
                        <Text span>Aktywni workerzy</Text>
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
                                        if (isCalculating) return;
                                        if (isSelected) {
                                            setSelectedWorkerIds(prev => prev.filter(id => id !== worker.id));
                                        } else {
                                            setSelectedWorkerIds(prev => [...prev, worker.id]);
                                        }
                                    }}
                                />
                            );
                        })}
                    </SimpleGrid>
                )}

                <Divider my="xl" />

                <Title order={3} mb="xs" c="white">Wyniki</Title>
                <ResultsPanel
                    isCalculating={isCalculating}
                    progress={progress}
                    taskParams={method === "trapezoidal" ? taskParams : monteCarloParams}
                    startTime={startTime}
                    result={result}
                    duration={duration}
                    tasksPerSecond={tasksPerSecond}
                    method={method}
                />
            </Paper>
        </Container>
    );
};
