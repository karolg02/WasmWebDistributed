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
} from "@mantine/core";
import { IconBrandChrome, IconBrandFirefox, IconBrandSafari, IconWorldWww } from "@tabler/icons-react";

const socket = io(`http://${window.location.hostname}:8080/client`);

interface TaskParams {
    a: number;
    b: number;
    dx: number;
    N: number;
}

export const ClientPanel: React.FC = () => {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [taskParams, setTaskParams] = useState<TaskParams>({
        a: 0,
        b: 3.14,
        dx: 0.00001,
        N: 100000,
    });
    // const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [result, setResult] = useState<number | null>(null);
    const [duration, setDuration] = useState<number | null>(null);

    useEffect(() => {
        socket.on("worker_update", (workerList: Worker[]) => {
            setWorkers(workerList);
        });

        socket.on("final_result", (data: { sum: number; duration: number }) => {
            setResult(data.sum);
            setDuration(data.duration);
        });

        return () => {
            socket.off("worker_update");
            socket.off("final_result");
        };
    }, []);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedWorkerIds.length === 0) {
            alert("Wybierz co najmniej jednego workera!");
            return;
        }

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
                        {workers.map(({ id, name }) => (
                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={id}>
                                <Card
                                    shadow="sm"
                                    padding="md"
                                    radius="md"
                                    withBorder
                                    style={{
                                        cursor: "pointer",
                                        backgroundColor: selectedWorkerIds.includes(id) ? "#dcbfa1" : undefined,
                                        transition: "background-color 0.2s ease",
                                    }}
                                    onClick={() =>
                                        setSelectedWorkerIds((prev) =>
                                            prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
                                        )
                                    }
                                >
                                    <Group gap="xs" align="center">
                                        {getBrowserIcon(name || id)}
                                        <Text size="sm" fw={500} lh={1.4}>
                                            {name || id}
                                        </Text>
                                    </Group>
                                </Card>
                            </Grid.Col>


                        ))}
                    </Grid>
                )}

                <Divider my="xl" />

                <Title order={3} mb="xs">
                    Wyniki
                </Title>
                {/* <Text>Postęp: {progress.done} / {progress.total}</Text> */}
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
