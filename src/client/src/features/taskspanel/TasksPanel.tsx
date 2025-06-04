import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Container, Paper, Title, Text, SimpleGrid, Group, Badge, Alert } from "@mantine/core";
import { useSocket } from "../hooks/useSocket";
import { AllTaskParams, CustomParams1D, CustomParams2D } from "../types";
import { ResultsPanel } from "../components/ResultsPanel";
import { WorkerCard } from "../components/WorkerCard";
import { IconAlertTriangle } from "@tabler/icons-react";
import { CustomForm } from "../components/methods/CustomForm";

export function TasksPanel() {
    const location = useLocation();
    const initialMethod = location.state?.method === 'custom2D' ? 'custom2D' : 'custom1D';

    const [currentMethod] = useState<'custom1D' | 'custom2D'>(initialMethod);
    const [error, setError] = useState<string | null>(null);

    const {
        socket, workers, selectedWorkerIds, setSelectedWorkerIds, progress, result, duration, isCalculating, startTime, queueStatus, startTask
    } = useSocket();

    const [customParams1D, setCustomParams1D] = useState<CustomParams1D>({
        method: 'custom1D',
        x1: 0,
        x2: 1,
        dx: 0.00001,
        N: 100000,
        wasmSource: ""
    });

    const [customParams2D, setCustomParams2D] = useState<CustomParams2D>({
        method: 'custom2D',
        x1: 0,
        x2: 1,
        y1: 0,
        y2: 1,
        dx: 0.001,
        dy: 0.001,
        N: 100000,
        wasmSource: ""
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

        const taskParams = currentMethod === 'custom1D' ? customParams1D : customParams2D;

        if (!taskParams.wasmSource || taskParams.wasmSource.trim() === "") {
            setError("Kod WASM nie może być pusty.");
            return;
        }

        const taskResult = await startTask(taskParams as AllTaskParams, selectedWorkerIds);

        if (taskResult && !taskResult.success) {
            setError(taskResult.error || "Wystąpił błąd podczas uruchamiania zadania");
        }
    };

    const getCurrentTaskParams = (): AllTaskParams => {
        return currentMethod === 'custom1D' ? customParams1D : customParams2D;
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

                {currentMethod === 'custom1D' ? (
                    <CustomForm
                        taskParams={customParams1D}
                        setTaskParams={setCustomParams1D}
                        onSubmit={handleSubmit}
                        disabled={isCalculating}
                        is2D={false}
                    />
                ) : (
                    <CustomForm
                        taskParams={customParams2D}
                        setTaskParams={setCustomParams2D}
                        onSubmit={handleSubmit}
                        disabled={isCalculating}
                        is2D={true}
                    />
                )}

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
                                        if (isCalculating) return;
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
                    method={currentMethod}
                    tasksPerSecond={null} />
            </Paper>
        </Container>
    );
}