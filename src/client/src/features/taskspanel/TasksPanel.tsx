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
        N: 100000
    });

    const [customParams2D, setCustomParams2D] = useState<CustomParams2D>({
        method: 'custom2D',
        x1: 0,
        x2: 1,
        y1: 0,
        y2: 1,
        dx: 0.001,
        dy: 0.001,
        N: 100000
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
        const form = e.target as HTMLFormElement;
        const wasmInput = form.querySelector('input[type="file"][accept=".wasm"]') as HTMLInputElement;

        const selectedWasmFile = wasmInput?.files?.[0];

        if (!selectedWasmFile) {
            setError("Musisz przesłać oba pliki: WASM i JS loader");
            return;
        }

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('wasmFile', selectedWasmFile);
            uploadFormData.append('clientId', socket?.id || '');
            uploadFormData.append('method', currentMethod);

            console.log('Uploading files:', {
                wasmFile: selectedWasmFile.name,
                clientId: socket?.id,
                method: currentMethod
            });

            const uploadResponse = await fetch(`http://${window.location.hostname}:8080/upload-wasm`, {
                method: 'POST',
                body: uploadFormData
            });

            const uploadResult = await uploadResponse.json();
            console.log('Upload result:', uploadResult);

            if (!uploadResult.success) {
                setError(uploadResult.error || "Błąd podczas przesyłania plików");
                return;
            }

            const taskParamsWithId = {
                ...taskParams,
                sanitizedId: uploadResult.sanitizedId
            };

            const taskResult = await startTask(taskParamsWithId as AllTaskParams, selectedWorkerIds);

            if (taskResult && !taskResult.success) {
                setError("Wystąpił błąd podczas uruchamiania zadania");
            }
        } catch (error) {
            setError("Błąd podczas komunikacji z serwerem");
            console.error('Upload error:', error);
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