import React from "react";
import { Card, Group, Stack, Text, Badge } from "@mantine/core";
import { IconBrandChrome, IconBrandFirefox, IconBrandSafari, IconWorldWww } from "@tabler/icons-react";
import { Worker } from "../types/Worker";
import { QueueStatus } from "../types/types";
import { getWorkerStatus } from "../utils/workerStatus";

interface WorkerCardProps {
    worker: Worker;
    selected: boolean;
    isCurrentClient: boolean;
    queueStatus?: QueueStatus[string] | null;
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

    const status = getWorkerStatus(queueStatus || { queueLength: 0, currentClient: null, isAvailable: false }, isCurrentClient);

    return (
        <Card
            shadow="lg"
            padding="md"
            radius="md"
            withBorder
            bg={selected ? "dark.6" : "dark.7"}
            style={{
                cursor: "pointer",
                opacity: queueStatus?.currentClient && !isCurrentClient ? 0.7 : 1,
                transition: "all 0.2s ease",
                borderColor: selected ? "#7950f2" : undefined,
                borderWidth: selected ? "2px" : "2px",
                marginBottom: "10px"
            }}
            onClick={onSelect}
        >
            <Group justify="space-between" align="flex-start">
                <Group gap="xs">
                    {getBrowserIcon(worker.specs.userAgent)}
                    <Stack gap={2}>
                        <Text size="sm" fw={500} c="white">
                            {worker.name || worker.id}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {worker.specs.platform}
                        </Text>
                        <Group gap={5}>
                            <Badge
                                color={status.color === "green" ? "#82c91e" :
                                    status.color === "red" ? "red" :
                                        status.color === "orange" ? "orange" : "gray"}
                                variant="light"
                                size="xs"
                            >
                                {status.message}
                            </Badge>
                            {status.badge && (
                                <Text size="xs" c="dimmed">
                                    ({status.badge})
                                </Text>
                            )}
                        </Group>
                    </Stack>
                </Group>
                <Stack gap={2} align="flex-end">
                    <Text size="xs" c="dimmed">
                        CPU: {worker.specs.hardwareConcurrency} cores
                    </Text>
                    <Text size="xs" c="dimmed">
                        Score: <Text span c="#82c91e" fw={500}>{worker.performance.benchmarkScore.toFixed(2)}</Text>
                    </Text>
                </Stack>
            </Group>
        </Card>
    );
};