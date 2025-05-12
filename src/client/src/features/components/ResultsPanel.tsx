import React from "react";
import { Stack, Group, Text, Progress } from "@mantine/core";
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
    const calculateEstimatedTimeRemaining = () => {
        if (!startTime || !isCalculating || progress.done === 0 || !tasksPerSecond) return null;
        const remainingTasks = taskParams.N - progress.done;
        if (remainingTasks <= 0) return null;
        return remainingTasks / tasksPerSecond;
    };

    return (
        <>
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
        </>
    );
};