import React, { useEffect, useState } from "react";
import { Stack, Group, Text, Progress, Paper, Card, RingProgress, Transition, Center, Box, Code, JsonInput } from "@mantine/core";
import { IconClockHour4, IconCheck, IconCalculator, IconHourglass, IconTrendingUp, IconBraces } from "@tabler/icons-react";
import { Progress as ProgressType } from "../types/types";
import { formatTime } from "../utils/formatTime";

interface ResultsPanelProps {
    isCalculating: boolean;
    progress: ProgressType;
    taskParams: any;
    startTime: number | null;
    result: any;
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

    const formatResult = (result: any) => {
        if (result === null || result === undefined) {
            return { display: "-", isJson: false, type: "empty" };
        }
        if (typeof result === 'object' && result !== null) {
            return {
                display: JSON.stringify(result, null, 2),
                isJson: true,
                parsed: result,
                type: "object"
            };
        }

        if (typeof result === 'string') {
            const trimmed = result.trim();
            try {
                const parsed = JSON.parse(trimmed);
                return {
                    display: JSON.stringify(parsed, null, 2),
                    isJson: true,
                    parsed: parsed,
                    type: "json"
                };
            } catch (e) {
                const asNumber = parseFloat(trimmed);
                if (!isNaN(asNumber) && isFinite(asNumber) && trimmed === asNumber.toString()) {
                    return {
                        display: trimmed,
                        isJson: false,
                        type: "number",
                        numericValue: asNumber
                    };
                }

                return {
                    display: trimmed,
                    isJson: false,
                    type: "text"
                };
            }
        }

        if (typeof result === 'number') {
            return {
                display: result.toString(),
                isJson: false,
                type: "number",
                numericValue: result
            };
        }

        return {
            display: String(result),
            isJson: false,
            type: "unknown"
        };
    };

    const resultFormatted = formatResult(result);

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
                        radius="xl"
                        p="xl"
                        mb="lg"
                        style={{
                            ...styles,
                            background: 'rgba(26, 27, 30, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            overflow: 'hidden'
                        }}
                    >
                        <Stack gap="lg">
                            <Group justify="space-between" mb="xs">
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
                                        <IconTrendingUp size={20} color="white" />
                                    </Box>
                                    <Text size="lg" fw={600} c="white">Trwa obliczanie...</Text>
                                </Group>
                                <Text size="md" fw={600} c="#7950f2">
                                    {progressPercentage.toFixed(1)}%
                                </Text>
                            </Group>

                            <Progress
                                value={progressPercentage}
                                size="xl"
                                radius="xl"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                }}
                                styles={{
                                    section: {
                                        background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                                    }
                                }}
                            />

                            <Group justify="space-between" align="center">
                                <Group gap="xs">
                                    <IconClockHour4 size={16} color="#7950f2" />
                                    <Text size="sm" c="rgba(255, 255, 255, 0.8)">
                                        Czas: {getElapsedTimeText()}
                                    </Text>
                                </Group>
                                <Group gap="xs">
                                    <IconHourglass size={16} color="#7950f2" />
                                    <Text size="sm" c="rgba(255, 255, 255, 0.8)">
                                        Pozostało: {getRemainingTimeText()}
                                    </Text>
                                </Group>
                            </Group>

                            <Group justify="center">
                                <Text ta="center" size="sm" c="rgba(255, 255, 255, 0.8)">
                                    {getProgressText()}
                                </Text>
                            </Group>
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
                        radius="xl"
                        p="xl"
                        style={{
                            ...styles,
                            background: 'rgba(26, 27, 30, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <Group justify="space-between" align="flex-start">
                            <Stack gap="md" style={{ flex: 1 }}>
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
                                        {resultFormatted.isJson ? (
                                            <IconBraces size={20} color="white" />
                                        ) : (
                                            <IconCalculator size={20} color="white" />
                                        )}
                                    </Box>
                                    <Text size="lg" fw={600} c="white">
                                        {resultFormatted.type === "json" ? "Wynik JSON" :
                                            resultFormatted.type === "number" ? "Wynik liczbowy" :
                                                "Wynik tekstowy"}
                                    </Text>
                                </Group>

                                {/* Wyświetl zależnie od typu */}
                                {resultFormatted.isJson ? (
                                    <Box>
                                        <Code
                                            block
                                            style={{
                                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                fontFamily: 'monospace',
                                                fontSize: '14px',
                                                color: '#7950f2',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                maxHeight: '300px',
                                                overflowY: 'auto'
                                            }}
                                        >
                                            {resultFormatted.display}
                                        </Code>

                                        {/* Kluczowe wartości z JSON */}
                                        {resultFormatted.parsed && (
                                            <Stack gap="xs" mt="md">
                                                {Object.entries(resultFormatted.parsed).map(([key, value]) => (
                                                    <Group gap="xs" key={key}>
                                                        <Text size="sm" c="rgba(255, 255, 255, 0.6)" tt="capitalize">
                                                            {key}:
                                                        </Text>
                                                        <Text size="sm" fw={600} c="#7950f2" style={{ fontFamily: 'monospace' }}>
                                                            {String(value)}
                                                        </Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        )}
                                    </Box>
                                ) : resultFormatted.type === "number" ? (
                                    <Text size="2.5rem" fw={700} c="#7950f2" style={{ fontFamily: 'monospace' }}>
                                        {resultFormatted.display}
                                    </Text>
                                ) : (
                                    <Text size="xl" fw={500} c="#7950f2" style={{
                                        fontFamily: resultFormatted.type === "text" ? 'inherit' : 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }}>
                                        {resultFormatted.display}
                                    </Text>
                                )}

                                <Group gap="xs">
                                    <IconClockHour4 size={16} color="#7950f2" />
                                    <Text size="sm" c="rgba(255, 255, 255, 0.8)">
                                        Czas obliczeń: {formatDuration(duration)}
                                    </Text>
                                </Group>
                            </Stack>

                            <RingProgress
                                sections={[{ value: 100, color: '#7950f2' }]}
                                size={80}
                                thickness={8}
                                roundCaps
                                label={
                                    <Center>
                                        <IconCheck style={{ width: 24, height: 24 }} color="#7950f2" />
                                    </Center>
                                }
                            />
                        </Group>
                    </Card>
                )}
            </Transition>
        </>
    );
};