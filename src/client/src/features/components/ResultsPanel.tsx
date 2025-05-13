import React, { useEffect, useState } from "react";
import { Stack, Group, Text, Progress, Paper, Card, RingProgress, Grid, Transition, Center } from "@mantine/core";
import { IconClockHour4, IconCheck, IconCalculator, IconHourglass } from "@tabler/icons-react";
import { Progress as ProgressType, TaskParams } from "../types";
import { formatTime } from "../utils/formatTime";

interface ResultsPanelProps {
    isCalculating: boolean;
    progress: ProgressType;
    taskParams: TaskParams;
    startTime: number | null;
    result: number | null;
    duration: number | null;
    tasksPerSecond: number | null;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
    isCalculating,
    progress,
    taskParams,
    startTime,
    result,
    duration,
    tasksPerSecond
}) => {
    const [showResult, setShowResult] = useState(false);
    const progressPercentage = (progress.done / taskParams.N) * 100;
    
    useEffect(() => {
        // Trigger animation when result is available
        if (result !== null) {
            setShowResult(false);
            setTimeout(() => setShowResult(true), 100);
        }
    }, [result]);

    const calculateEstimatedTimeRemaining = () => {
        if (!startTime || !isCalculating || progress.done === 0 || !tasksPerSecond) return null;
        const remainingTasks = taskParams.N - progress.done;
        if (remainingTasks <= 0) return null;
        return remainingTasks / tasksPerSecond;
    };

    // Format duration safely
    const formatDuration = (value: any) => {
        if (value === null || value === undefined) return "-";
        if (typeof value === 'number') {
            return `${value.toFixed(3)} sekund`;
        }
        return `${value} sekund`;
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
                                            Czas wykonywania: {startTime ? formatTime((Date.now() - startTime) / 1000) : '-'}
                                        </Text>
                                    </Group>
                                </Grid.Col>
                                
                                <Grid.Col span={6}>
                                    <Group>
                                        <IconHourglass size={18} color="#5C5F66" />
                                        <Text size="sm" c="dimmed">
                                            Pozostało: {calculateEstimatedTimeRemaining() !== null
                                                ? formatTime(calculateEstimatedTimeRemaining()!)
                                                : '-'}
                                        </Text>
                                    </Group>
                                </Grid.Col>
                                
                                <Grid.Col span={12}>
                                    <Text ta="center" size="sm">
                                        Postęp: {progress.done} / {taskParams.N} zadań
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
                                <Text size="xl" fw={500} style={{ fontFamily: 'monospace' }}>
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