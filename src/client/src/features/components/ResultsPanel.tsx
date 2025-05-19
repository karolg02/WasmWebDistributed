import React, { useEffect, useState } from "react";
import { Stack, Group, Text, Progress, Paper, Card, RingProgress, Grid, Transition, Center } from "@mantine/core";
import { IconClockHour4, IconCheck, IconCalculator, IconHourglass } from "@tabler/icons-react";
import { Progress as ProgressType, TaskParams } from "../types";
import { formatTime } from "../utils/formatTime";

interface ResultsPanelProps {
    isCalculating: boolean;
    progress: ProgressType;
    taskParams: TaskParams | any;
    startTime: number | null;
    result: number | null;
    duration: number | null;
    tasksPerSecond: number | null;
    method?: 'trapezoidal' | 'montecarlo';
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
    isCalculating,
    progress,
    taskParams,
    startTime,
    result,
    duration,
    tasksPerSecond,
    method = 'trapezoidal'
}) => {
    const [showResult, setShowResult] = useState(false);
    const [localStartTime, setLocalStartTime] = useState<number | null>(null);

    useEffect(() => {
        if (isCalculating && !localStartTime) {
            setLocalStartTime(Date.now());
        } else if (!isCalculating) {
            setLocalStartTime(null);
        }
    }, [isCalculating]);

    const progressPercentage = (progress.done / taskParams.N) * 100;

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

        if (method === 'montecarlo') {
            const percentComplete = progress.done / taskParams.N;
            if (percentComplete <= 0 || percentComplete > 0.99) return null;
            const estimatedTotalTime = elapsedTime / percentComplete;
            return Math.max(0, estimatedTotalTime - elapsedTime);
        } else {
            const currentTasksPerSecond = progress.done / elapsedTime;
            if (currentTasksPerSecond <= 0) return null;
            const remainingTasks = taskParams.N - progress.done;
            const effectiveRate = tasksPerSecond && tasksPerSecond > 0 ? tasksPerSecond : currentTasksPerSecond;
            return remainingTasks / effectiveRate;
        }
    };

    const formatDuration = (value: any) => {
        if (value === null || value === undefined) return "-";
        if (typeof value === 'number') {
            return `${value.toFixed(3)} sekund`;
        }
        return `${value} sekund`;
    };

    const getProgressText = () => {
        if (method === 'montecarlo') {
            const doneSamples = progress.done * taskParams.samples;
            const totalSamples = taskParams.N * taskParams.samples;
            return `Postęp: ${doneSamples.toLocaleString()} / ${totalSamples.toLocaleString()} próbek`;
        } else {
            return `Postęp: ${progress.done} / ${taskParams.N} zadań`;
        }
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
                                <Text size="md" fw={500} c="cyan">Trwa obliczanie...</Text>
                                <Text size="sm" c="dimmed">
                                    {progressPercentage.toFixed(1)}%
                                </Text>
                            </Group>

                            <Progress
                                value={progressPercentage}
                                size="xl"
                                radius="xl"
                                striped
                                animated
                                color="cyan"
                            />

                            <Grid gutter="md">
                                <Grid.Col span={6}>
                                    <Group>
                                        <IconClockHour4 size={18} color="#5C5F66" />
                                        <Text size="sm" c="dimmed">
                                            Czas wykonywania: {getElapsedTimeText()}
                                        </Text>
                                    </Group>
                                </Grid.Col>

                                <Grid.Col span={6}>
                                    <Group>
                                        <IconHourglass size={18} color="#5C5F66" />
                                        <Text size="sm" c="dimmed">
                                            Pozostało: {getRemainingTimeText()}
                                        </Text>
                                    </Group>
                                </Grid.Col>

                                <Grid.Col span={12}>
                                    <Text ta="center" size="sm">
                                        {getProgressText()}
                                    </Text>
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Paper>
                )}
            </Transition>

            <Transition
                mounted={!isCalculating && result !== null}
                transition="fade"
                duration={400}
                timingFunction="ease"
                exitDuration={200}
            >
                {(styles) => (
                    <Card
                        withBorder
                        radius="md"
                        p="lg"
                        style={{ ...styles }}
                        bg="dark.7"
                    >
                        <Group justify="space-between" align="flex-start">
                            <Stack gap="xs">
                                <Text size="lg" fw={700} c="cyan">Wynik końcowy</Text>
                                <Text size="xl" fw={500} c="#37b24d" style={{ fontFamily: 'monospace' }}>
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
                                sections={[{ value: 100, color: 'cyan' }]}
                                size={80}
                                thickness={8}
                                roundCaps
                                label={
                                    <Center>
                                        <IconCheck style={{ width: 24, height: 24 }} color="#40C057" />
                                    </Center>
                                }
                            />
                        </Group>
                    </Card>
                )}
            </Transition>

            {!isCalculating && result === null && (
                <Paper
                    withBorder
                    radius="md"
                    p="md"
                    bg="dark.7"
                >
                    <Text c="dimmed" ta="center">Wybierz parametry i kliknij "Start" aby rozpocząć obliczenia</Text>
                </Paper>
            )}
        </>
    );
};