import React, { useEffect, useState } from "react";
import { Stack, Group, Text, Progress, Paper, Card, RingProgress, Transition, Center } from "@mantine/core";
import { IconClockHour4, IconCheck, IconCalculator, IconHourglass } from "@tabler/icons-react";
import { Progress as ProgressType } from "../types";
import { formatTime } from "../utils/formatTime";

interface ResultsPanelProps {
    isCalculating: boolean;
    progress: ProgressType;
    taskParams: any;
    startTime: number | null;
    result: number | null;
    duration: number | null;
    tasksPerSecond: number | null;
    method?: 'custom1D' | 'custom2D';
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
    isCalculating,
    progress,
    taskParams,
    startTime,
    result,
    duration,
    tasksPerSecond,
    method
}) => {
    const [, setShowResult] = useState(false);
    const [localStartTime, setLocalStartTime] = useState<number | null>(null);

    const getTotalTasks = () => {
        if (taskParams.params && Array.isArray(taskParams.params)) {
            if (method === 'custom1D') {
                return taskParams.params[2] || 0;
            } else if (method === 'custom2D') {
                return taskParams.params[4] || 0;
            }
        }
        return 0;
    };

    useEffect(() => {
        if (isCalculating && !localStartTime) {
            setLocalStartTime(Date.now());
        } else if (!isCalculating) {
            setLocalStartTime(null);
        }
    }, [isCalculating]);

    const totalTasks = getTotalTasks();

    const progressPercentage = totalTasks > 0 ? (progress.done / totalTasks) * 100 : 0;

    useEffect(() => {
        if (result !== null) {
            setShowResult(false);
            setTimeout(() => setShowResult(true), 100);
        }
    }, [result]);

    const effectiveStartTime = startTime || localStartTime;

    const getCurrentElapsedTime = () => {
        if (!effectiveStartTime) return null;
        return (Date.now() - effectiveStartTime) / 1000;
    };

    const calculateEstimatedTimeRemaining = () => {
        const elapsedTime = getCurrentElapsedTime();
        if (!isCalculating || !elapsedTime || elapsedTime < 1) return null;

        const percentComplete = progress.done / totalTasks;
        if (percentComplete <= 0 || percentComplete > 0.99) return null;

        const currentTasksPerSecond = progress.done / elapsedTime;
        if (currentTasksPerSecond <= 0) return null;

        const remainingTasks = totalTasks - progress.done;
        const effectiveRate = tasksPerSecond && tasksPerSecond > 0 ? tasksPerSecond : currentTasksPerSecond;
        return remainingTasks / effectiveRate;
    };

    const formatDuration = (value: any) => {
        if (value === null || value === undefined) return "-";
        if (typeof value === 'number') {
            return `${value.toFixed(3)} sekund`;
        }
        return `${value} sekund`;
    };

    const getProgressText = () => {
        return `Postęp: ${progress.done} / ${totalTasks} zadań`;
    };

    const getElapsedTimeText = () => {
        const elapsed = getCurrentElapsedTime();
        return elapsed ? formatTime(elapsed) : '-';
    };

    const getRemainingTimeText = () => {
        const remaining = calculateEstimatedTimeRemaining();
        return remaining !== null ? formatTime(remaining) : '-';
    };

    return (
        <>
            <Transition
                mounted={isCalculating}
                transition="slide-down"
                duration={400}
                timingFunction="ease"
            >
                {(styles) => (
                    <Paper
                        withBorder
                        radius="md"
                        p="md"
                        style={{ ...styles, overflow: 'hidden' }}
                        bg="dark.7"
                        mb="lg"
                    >
                        <Stack gap="md">
                            <Group justify="space-between" mb="xs">
                                <Text size="md" fw={500} c="#82c91e">Trwa obliczanie...</Text>
                                <Text size="sm" c="#82c91e">
                                    {progressPercentage.toFixed(1)}%
                                </Text>
                            </Group>

                            <Progress
                                value={progressPercentage}
                                size="xl"
                                radius="xl"
                                striped
                                animated
                                color="#9775fa"
                            />

                            <Group justify="space-between" align="center">
                                <Text size="md" c="dimmed">
                                    <IconClockHour4 size={14} color="#5C5F66" style={{ marginRight: "4px" }} />
                                    Czas wykonywania: {getElapsedTimeText()}
                                </Text>
                                <Text size="md" c="dimmed">
                                    <IconHourglass size={14} color="#5C5F66" style={{ marginRight: "4px" }} />
                                    Pozostało: {getRemainingTimeText()}
                                </Text>
                            </Group>

                            <Group justify="center">
                                <Text ta="center" size="sm" c="white">
                                    {getProgressText()}
                                </Text>
                            </Group>
                        </Stack>
                    </Paper>
                )}
            </Transition >

            <Transition
                mounted={!isCalculating && result !== null}
                transition="fade"
                duration={400}
                timingFunction="ease"
                exitDuration={200}
            >
                {(styles) => (
                    <>
                        <Card
                            withBorder
                            radius="md"
                            p="lg"
                            style={{ ...styles }}
                            bg="dark.7"
                        >
                            <Group justify="space-between" align="flex-start">
                                <Stack gap="xs">
                                    <Text size="lg" fw={700} c="#9775fa" >Wynik końcowy</Text>
                                    <Text size="xl" fw={500} c="#82c91e" style={{ fontFamily: 'monospace' }}>
                                        {result !== null ? result.toFixed(6) : "-"}
                                    </Text>
                                    <Group>
                                        <IconCalculator size={16} color="#5C5F66" />
                                        <Text size="sm" c="dimmed">
                                            Czas obliczeń: {formatDuration(duration)}
                                        </Text>
                                    </Group>
                                </Stack>

                                <RingProgress
                                    sections={[{ value: 100, color: '#7950f2' }]}
                                    size={80}
                                    thickness={8}
                                    roundCaps
                                    label={<Center>
                                        <IconCheck style={{ width: 24, height: 24 }} color="#82c91e" />
                                    </Center>} />
                            </Group>
                        </Card></>
                )}
            </Transition>
        </>
    );
};