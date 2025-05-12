import React from "react";
import { Card, Group, Stack, Text, Grid } from "@mantine/core";
import { IconBrandChrome, IconBrandFirefox, IconBrandSafari, IconWorldWww } from "@tabler/icons-react";
import { Worker } from "../types/Worker";
import { QueueStatus } from "../types";
import { getWorkerStatus } from "../utils/workerStatus";

interface WorkerCardProps {
    worker: Worker;
    selected: boolean;
    isCurrentClient: boolean;
    queueStatus: QueueStatus[string];
    onSelect: () => void;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({
    worker,
    selected,
    isCurrentClient,
    queueStatus,
    onSelect
}) => {
    const getBrowserIcon = (idOrName: string) => {
        if (idOrName.toLowerCase().includes("chrome")) return <IconBrandChrome size={20} />;
        if (idOrName.toLowerCase().includes("firefox")) return <IconBrandFirefox size={20} />;
        if (idOrName.toLowerCase().includes("safari")) return <IconBrandSafari size={20} />;
        return <IconWorldWww size={20} />;
    };

    const status = getWorkerStatus(queueStatus, isCurrentClient);

    return (
        <Grid.Col span={{ base: 12, sm: 12, md: 6 }}>
            <Card
                shadow="sm"
                padding="md"
                radius="md"
                withBorder
                style={{
                    cursor: "pointer",
                    backgroundColor: selected ? "#dcbfa1" : undefined,
                    opacity: queueStatus?.currentClient && !isCurrentClient ? 0.8 : 1,
                    transition: "all 0.2s ease",
                }}
                onClick={onSelect}
            >
                <Group justify="space-between" align="flex-start">
                    <Group gap="xs">
                        {getBrowserIcon(worker.specs.userAgent)}
                        <Stack gap={2}>
                            <Text size="sm" fw={500}>
                                {worker.name || worker.id}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {worker.specs.platform}
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
                            CPU: {worker.specs.hardwareConcurrency} cores
                        </Text>
                        <Text size="xs">
                            Score: {worker.performance.benchmarkScore.toFixed(2)}
                        </Text>
                    </Stack>
                </Group>
            </Card>
        </Grid.Col>
    );
};