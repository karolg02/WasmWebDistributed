import React from "react";
import { Card, Group, Text, Badge, Stack, Progress, Box } from "@mantine/core";
import {
    IconBrandChrome,
    IconBrandFirefox,
    IconBrandSafari,
    IconWorldWww,
    IconCpu,
    IconCheck,
    IconClock,
    IconUsers
} from "@tabler/icons-react";
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
        if (idOrName.toLowerCase().includes("chrome")) return <IconBrandChrome size={20} color="white" />;
        if (idOrName.toLowerCase().includes("firefox")) return <IconBrandFirefox size={20} color="white" />;
        if (idOrName.toLowerCase().includes("safari")) return <IconBrandSafari size={20} color="white" />;
        return <IconWorldWww size={20} color="white" />;
    };

    const status = getWorkerStatus(
        queueStatus || { queueLength: 0, currentClient: null, isAvailable: true, isCalculating: false },
        isCurrentClient
    );

    return (
        <Card
            shadow="xl"
            padding="xl"
            radius="xl"
            onClick={onSelect}
            style={{
                cursor: "pointer",
                background: selected ?
                    'rgba(121, 80, 242, 0.15)' :
                    'rgba(26, 27, 30, 0.6)',
                backdropFilter: 'blur(20px)',
                border: selected ?
                    '2px solid #7950f2' :
                    '1px solid rgba(255, 255, 255, 0.1)',
                opacity: queueStatus?.currentClient && !isCurrentClient ? 0.6 : 1,
                transition: 'all 0.4s ease',
                transform: selected ? 'translateY(-5px) scale(1.02)' : 'none',
                boxShadow: selected ?
                    '0 15px 40px rgba(121, 80, 242, 0.3), 0 0 30px rgba(255, 255, 255, 0.1)' :
                    '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
        >
            <Group justify="space-between" align="flex-start" mb="md">
                <Group gap="sm">
                    <Box
                        style={{
                            background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                            borderRadius: '12px',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {getBrowserIcon(worker.specs.userAgent)}
                    </Box>
                    <Stack gap={2}>
                        <Text fw={600} size="sm" c="white">
                            {worker.name || worker.id}
                        </Text>
                        <Text size="xs" c="rgba(255, 255, 255, 0.7)">
                            {worker.specs.platform}
                        </Text>
                    </Stack>
                </Group>

                <Badge
                    size="sm"
                    style={{
                        backgroundColor: status.color === "green" ? "#40c057" :
                            status.color === "red" ? "#ff6b6b" :
                                status.color === "orange" ? "#ff9500" : "#6c757d",
                        color: 'white'
                    }}
                >
                    {selected && <IconCheck size={12} style={{ marginRight: '4px' }} />}
                    {status.message}
                </Badge>
            </Group>

            <Stack gap="xs">
                <Group justify="space-between">
                    <Group gap="xs">
                        <IconCpu size={16} color="#7950f2" />
                        <Text size="xs" c="rgba(255, 255, 255, 0.8)">CPU</Text>
                    </Group>
                    <Text size="xs" fw={600} c="white">
                        {worker.specs.hardwareConcurrency} cores
                    </Text>
                </Group>

                <Group justify="space-between">
                    <Group gap="xs">
                        <Text size="xs" c="rgba(255, 255, 255, 0.8)">Wydajność</Text>
                    </Group>
                    <Text size="xs" fw={600} c="white">
                        {worker.performance.benchmarkScore.toFixed(2)} ops/sec
                    </Text>
                </Group>

                <Group justify="space-between">
                    <Group gap="xs">
                        <Text size="xs" c="rgba(255, 255, 255, 0.8)">Opóźnienie</Text>
                    </Group>
                    <Text size="xs" fw={600} c="white">
                        {worker.performance.latency.toFixed(2)} ms
                    </Text>
                </Group>

                {queueStatus && queueStatus.queueLength > 0 && (
                    <Group justify="space-between">
                        <Group gap="xs">
                            <IconUsers size={16} color="#ff9500" />
                            <Text size="xs" c="rgba(255, 255, 255, 0.8)">W kolejce</Text>
                        </Group>
                        <Badge size="xs" style={{ backgroundColor: "#ff9500", color: 'white' }}>
                            {queueStatus.queueLength} {queueStatus.queueLength === 1 ? 'osoba' : 'osób'}
                        </Badge>
                    </Group>
                )}

                {status.badge && (
                    <Group justify="space-between">
                        <Group gap="xs">
                            <IconClock size={16} color="#ff9500" />
                            <Text size="xs" c="rgba(255, 255, 255, 0.8)">Status</Text>
                        </Group>
                        <Badge size="xs" color="orange">
                            {status.badge}
                        </Badge>
                    </Group>
                )}
            </Stack>

            {selected && (
                <Box
                    mt="md"
                    style={{
                        height: '3px',
                        background: 'linear-gradient(90deg, #7950f2, #9775fa)',
                        borderRadius: '2px',
                    }}
                />
            )}
        </Card>
    );
};