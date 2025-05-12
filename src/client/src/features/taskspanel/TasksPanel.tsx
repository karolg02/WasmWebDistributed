import React, { useState } from "react";
import { Container, Paper, Title, Divider, Text, Grid } from "@mantine/core";
import { TaskForm } from "../components/TaskForm";
import { WorkerCard } from "../components/WorkerCard";
import { ResultsPanel } from "../components/ResultsPanel";
import { useSocket } from "../hooks/useSocket";
import { TaskParams } from "../types";

export const ClientPanel: React.FC = () => {
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

    const [taskParams, setTaskParams] = useState<TaskParams>({
        a: 0,
        b: 3.14,
        dx: 0.00001,
        N: 100000,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedWorkerIds.length === 0) {
            alert("Wybierz co najmniej jednego workera!");
            return;
        }
        startTask(taskParams, selectedWorkerIds);
    };

    return (
        <Container size="md" py="xl">
            <Paper withBorder shadow="md" radius="md" p="xl">
                <Title order={2} mb="md">Panel Klienta</Title>
                <Divider my="md" />

                <TaskForm
                    taskParams={taskParams}
                    setTaskParams={setTaskParams}
                    onSubmit={handleSubmit}
                    disabled={isCalculating}
                />

                <Divider my="xl" />

                <Title order={3} mb="sm">Aktywni workerzy</Title>

                {workers.length === 0 ? (
                    <Text color="dimmed">Brak dostępnych workerów.</Text>
                ) : (
                    <Grid gutter="md">
                        {workers.map(worker => (
                            <WorkerCard
                                key={worker.id}
                                worker={worker}
                                selected={selectedWorkerIds.includes(worker.id)}
                                isCurrentClient={queueStatus[worker.id]?.currentClient === socket.id}
                                queueStatus={queueStatus[worker.id]}
                                onSelect={() => {
                                    setSelectedWorkerIds(prev =>
                                        prev.includes(worker.id)
                                            ? prev.filter(id => id !== worker.id)
                                            : [...prev, worker.id]
                                    );
                                }}
                            />
                        ))}
                    </Grid>
                )}

                <Divider my="xl" />

                <Title order={3} mb="xs">Wyniki</Title>
                <ResultsPanel
                    isCalculating={isCalculating}
                    progress={progress}
                    taskParams={taskParams}
                    startTime={startTime}
                    result={result}
                    duration={duration}
                    tasksPerSecond={tasksPerSecond}
                />
            </Paper>
        </Container>
    );
};
