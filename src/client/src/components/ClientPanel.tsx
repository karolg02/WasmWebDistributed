import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Worker } from "../types/Worker";
import {
    Card,
    Grid,
    Text,
    Title,
    Button,
    NumberInput,
    Divider,
    Container,
    Stack,
    Group,
    Paper,
    Progress,
} from "@mantine/core";
import { IconBrandChrome, IconBrandFirefox, IconBrandSafari, IconWorldWww } from "@tabler/icons-react";

const socket = io(`http://${window.location.hostname}:8080/client`);

interface TaskParams {
    a: number;
    b: number;
    dx: number;
    N: number;
}

interface Progress {
    done: number;
    elapsedTime: number;
}

interface QueueStatus {
    [workerId: string]: {
        queueLength: number;
        currentClient: string | null;
        isAvailable: boolean;  // nowe pole
    };
}

const formatTime = (seconds: number): string => {
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
};

export const ClientPanel: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [taskParams, setTaskParams] = useState<TaskParams>({
        a: 0,
        b: 3.14,
        dx: 0.00001,
        N: 100000,
    });
    const [progress, setProgress] = useState<Progress>({ done: 0, elapsedTime: 0 });
    const [result, setResult] = useState<number | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [tasksPerSecond, setTasksPerSecond] = useState<number | null>(null);
    const [queueStatus, setQueueStatus] = useState<QueueStatus>({});

    useEffect(() => {
        socket.on("worker_update", (workerList: Worker[]) => {
            setWorkers(workerList);
        });

        socket.on("task_progress", (data: { done: number; elapsedTime: number }) => {
            setProgress(data);
            setIsCalculating(true);
        });

        socket.on("final_result", (data: { sum: number; duration: number }) => {
            setResult(data.sum);
            setDuration(data.duration);
            setProgress({ done: 0, elapsedTime: 0 });
            setIsCalculating(false);
            setStartTime(null);
            setTasksPerSecond(null);
        });

        socket.on("queue_status", (status: QueueStatus) => {
            setQueueStatus(status);
        });

        return () => {
            socket.off("worker_update");
            socket.off("task_progress");
            socket.off("final_result");
            socket.off("queue_status");
        };
    }, []);

    useEffect(() => {
        if (!startTime || !isCalculating || progress.done === 0) return;

        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - startTime) / 1000;
        const currentTasksPerSecond = progress.done / elapsedSeconds;

        if (!tasksPerSecond) {
            setTasksPerSecond(currentTasksPerSecond);
        } else {
            setTasksPerSecond(prev => ((prev ?? 0) * 0.7) + (currentTasksPerSecond * 0.3));
        }
    }, [progress.done, startTime, isCalculating]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedWorkerIds.length === 0) {
            alert("Wybierz co najmniej jednego workera!");
            return;
        }

        setIsCalculating(true);
        setResult(null);
        setDuration(null);
        setStartTime(Date.now());
        setTasksPerSecond(null);
        setProgress({ done: 0, elapsedTime: 0 });

        socket.emit("start", {
            workerIds: selectedWorkerIds,
            taskParams,
        });
    };

    const getBrowserIcon = (idOrName: string) => {
        if (idOrName.toLowerCase().includes("chrome")) return <IconBrandChrome size={20} />;
        if (idOrName.toLowerCase().includes("firefox")) return <IconBrandFirefox size={20} />;
        if (idOrName.toLowerCase().includes("safari")) return <IconBrandSafari size={20} />;
        return <IconWorldWww size={20} />;
    };

    const calculateEstimatedTimeRemaining = () => {
        if (!startTime || !isCalculating || progress.done === 0 || !tasksPerSecond) return null;

        const remainingTasks = taskParams.N - progress.done;
        if (remainingTasks <= 0) return null;

        return remainingTasks / tasksPerSecond;
    };

    const renderWorkerCard = ({ id, name, specs, performance }: Worker) => {
        const workerStatus = queueStatus[id];
        const isInUse = workerStatus?.currentClient !== null;
        const queueLength = workerStatus?.queueLength ?? 0;
        const isCurrentUserInQueue = selectedWorkerIds.includes(id);
        const isCurrentUserActive = workerStatus?.currentClient === socket.id;

        const getWorkerStatus = () => {
            // Jeśli worker wykonuje nasze zadanie
            if (isCurrentUserActive) {
                return {
                    message: "Wykonuje twoje zadanie",
                    color: "green",
                    badge: null
                };
            }

            // Jeśli worker wykonuje czyjeś zadanie
            if (workerStatus?.currentClient) {
                if (isCurrentUserInQueue) {
                    return {
                        message: "Zajęty",
                        color: "orange",
                        badge: `Jesteś ${queueLength}. w kolejce`
                    };
                }
                return {
                    message: "Zajęty",
                    color: "red",
                    badge: `W kolejce: ${queueLength}`
                };
            }

            // Worker jest wolny
            return {
                message: "Dostępny",
                color: "green",
                badge: queueLength > 0 ? `W kolejce: ${queueLength}` : null
            };
        };

        const status = getWorkerStatus();

        return (
            <Grid.Col span={{ base: 12, sm: 12, md: 6 }} key={id}>
                <Card
                    shadow="sm"
                    padding="md"
                    radius="md"
                    withBorder
                    style={{
                        cursor: "pointer", // Zawsze pointer, bo można dodać do kolejki
                        backgroundColor: selectedWorkerIds.includes(id) ? "#dcbfa1" : undefined,
                        opacity: isInUse && !isCurrentUserActive && !isCurrentUserInQueue ? 0.8 : 1,
                        transition: "all 0.2s ease",
                    }}
                    onClick={() => {
                        // Zawsze pozwalamy na dodanie/usunięcie z kolejki
                        setSelectedWorkerIds((prev) =>
                            prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
                        );
                    }}
                >
                    <Group justify="space-between" align="flex-start">
                        <Group gap="xs">
                            {getBrowserIcon(specs.userAgent)}
                            <Stack gap={2}>
                                <Text size="sm" fw={500}>
                                    {name || id}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {specs.platform}
                                </Text>
                                <Group gap={5}>
                                    <Text size="xs" c={status.color}>
                                        {status.message}
                                    </Text>
                                    {status.badge && (
                                        <Text size="xs" c="dimmed">
                                            ({status.badge})
                                        </Text>
                                    )}
                                </Group>
                            </Stack>
                        </Group>
                        <Stack gap={2} align="flex-end">
                            <Text size="xs">
                                CPU: {specs.hardwareConcurrency} cores
                            </Text>
                            <Text size="xs">
                                Score: {performance.benchmarkScore.toFixed(2)}
                            </Text>
                        </Stack>
                    </Group>
                </Card>
            </Grid.Col>
        );
    };

    return (
        <Container size="md" py="xl">
            <Paper withBorder shadow="md" radius="md" p="xl">
                <Title order={2} mb="md">
                    Panel Klienta
                </Title>
                <Divider my="md" />

                <form onSubmit={handleSubmit}>
                    <Stack gap="sm">
                        <Group grow>
                            <NumberInput
                                label="Zakres a"
                                name="a"
                                value={taskParams.a}
                                onChange={(val) =>
                                    setTaskParams((p) => ({
                                        ...p,
                                        a: typeof val === "number" ? val : 0,
                                    }))
                                }
                                required
                            />
                            <NumberInput
                                label="Zakres b"
                                name="b"
                                value={taskParams.b}
                                onChange={(val) =>
                                    setTaskParams((p) => ({
                                        ...p,
                                        b: typeof val === "number" ? val : 0,
                                    }))
                                }
                                required
                            />
                        </Group>

                        <NumberInput
                            label="Krok dx"
                            name="dx"
                            value={taskParams.dx}
                            onChange={(val) =>
                                setTaskParams((p) => ({
                                    ...p,
                                    dx: typeof val === "number" ? val : 0,
                                }))
                            }
                            step={0.00001}
                            required
                        />

                        <NumberInput
                            label="Ilość zadań"
                            name="N"
                            value={taskParams.N}
                            onChange={(val) =>
                                setTaskParams((p) => ({
                                    ...p,
                                    N: typeof val === "number" ? val : 0,
                                }))
                            }
                            required
                        />

                        <Button type="submit" fullWidth mt="sm" size="md">
                            Start
                        </Button>
                    </Stack>
                </form>

                <Divider my="xl" />

                <Title order={3} mb="sm">
                    Aktywni workerzy
                </Title>

                {workers.length === 0 ? (
                    <Text color="dimmed">Brak dostępnych workerów.</Text>
                ) : (
                    <Grid gutter="md">
                        {workers.map(worker => renderWorkerCard(worker))}
                    </Grid>
                )}

                <Divider my="xl" />

                <Title order={3} mb="xs">
                    Wyniki
                </Title>
                {isCalculating && (
                    <Stack gap="xs" mb="md">
                        <Progress
                            value={(progress.done / taskParams.N) * 100}
                            size="xl"
                            radius="xl"
                            striped
                            animated
                        />
                        <Text size="sm" ta="center">
                            Postęp: {progress.done} / {taskParams.N} ({((progress.done / taskParams.N) * 100).toFixed(1)}%)
                        </Text>
                        <Group justify="center" gap="xs">
                            <Text size="sm" c="dimmed">
                                Czas wykonywania: {startTime ? formatTime((Date.now() - startTime) / 1000) : '-'}
                            </Text>
                            {startTime && (
                                <>
                                    <Text size="sm" c="dimmed">|</Text>
                                    <Text size="sm" c="dimmed">
                                        Pozostało: {calculateEstimatedTimeRemaining() !== null
                                            ? formatTime(calculateEstimatedTimeRemaining()!)
                                            : '-'}
                                    </Text>
                                </>
                            )}
                        </Group>
                    </Stack>
                )}
                <Text>
                    <strong>Wynik końcowy:</strong>{" "}
                    {result !== null ? result.toFixed(6) : "-"}
                </Text>
                <Text>
                    <strong>Czas obliczeń:</strong> {duration ?? "-"} sekund
                </Text>
            </Paper>
        </Container>
    );
};
