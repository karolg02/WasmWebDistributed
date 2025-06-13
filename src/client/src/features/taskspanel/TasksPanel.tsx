import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Container, Paper, Title, Text, SimpleGrid, Group, Badge, Alert, Box } from "@mantine/core";
import { useSocket } from "../hooks/useSocket";
import { AllTaskParams, CustomParams1D, CustomParams2D } from "../types/types";
import { ResultsPanel } from "../components/ResultsPanel";
import { WorkerCard } from "../components/WorkerCard";
import { IconAlertTriangle, IconCpu } from "@tabler/icons-react";
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
        params: [0, 1, 10000, 0.001],
    });

    const [customParams2D, setCustomParams2D] = useState<CustomParams2D>({
        method: 'custom2D',
        params: [0, 1, 0, 1, 10000, 0.001, 0.001],
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
            setError("Musisz przesłać plik WASM");
            return;
        }

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('wasmFile', selectedWasmFile);
            uploadFormData.append('clientId', socket?.id || '');
            uploadFormData.append('method', currentMethod);

            const uploadResponse = await fetch(`http://${window.location.hostname}:8080/upload-wasm`, {
                method: 'POST',
                body: uploadFormData
            });

            const uploadResult = await uploadResponse.json();

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
        <Container size="lg" py="xl" className="fade-in">
            <Box mb="xl" ta="center">
                <Box
                    style={{
                        background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                        borderRadius: '50%',
                        padding: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px',
                        boxShadow: '0 8px 32px rgba(121, 80, 242, 0.4)',
                    }}
                >
                    <IconCpu size={32} color="white" />
                </Box>
                <Title
                    order={1}
                    size="2.5rem"
                    mb="md"
                    style={{
                        background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    Panel Zadań {currentMethod === 'custom2D' ? '2D' : '1D'}
                </Title>
                <Text size="lg" c="rgba(255, 255, 255, 0.8)">
                    Skonfiguruj i uruchom swoje zadanie obliczeniowe
                </Text>
            </Box>

            <Paper
                style={{
                    background: 'rgba(26, 27, 30, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                p="xl"
                radius="xl"
            >
                {error && (
                    <Alert
                        icon={<IconAlertTriangle size={16} />}
                        title="Błąd"
                        color="red"
                        mb="xl"
                        withCloseButton
                        onClose={() => setError(null)}
                        style={{
                            background: 'rgba(255, 107, 107, 0.1)',
                            border: '1px solid rgba(255, 107, 107, 0.3)',
                        }}
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

                <Box mt="xl">
                    <Group justify="space-between" mb="lg">
                        <Title order={3} c="white">
                            <Group gap="xs">
                                <IconCpu size={24} color="#7950f2" />
                                <Text span>Aktywne przeglądarki</Text>
                            </Group>
                        </Title>
                        <Badge
                            size="lg"
                            style={{
                                background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                                color: 'white'
                            }}
                        >
                            {workers.length}
                        </Badge>
                    </Group>

                    {workers.length === 0 ? (
                        <Paper
                            p="xl"
                            radius="lg"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                textAlign: 'center'
                            }}
                        >
                            <Text c="rgba(255, 255, 255, 0.7)" size="lg">
                                Brak dostępnych workerów. Otwórz stronę workera w nowej przeglądarce.
                            </Text>
                        </Paper>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mb="xl">
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
                </Box>

                <ResultsPanel
                    isCalculating={isCalculating}
                    progress={progress}
                    taskParams={getCurrentTaskParams()}
                    startTime={startTime}
                    result={result}
                    duration={duration}
                    method={currentMethod}
                    tasksPerSecond={null}
                />
            </Paper>
        </Container>
    );
}