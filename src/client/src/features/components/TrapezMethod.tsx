import React, { } from "react";
import {
    Stack,
    Group,
    NumberInput,
    Button,
    Paper,
    Title,
    Transition,
    Textarea,
    Text,
    Alert,
    Accordion,
    Card,
    Badge
} from "@mantine/core";
import { IconCalculator, IconPlayerPlay, IconFunction, IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { TaskParams } from "../types";

interface TaskFormProps {
    taskParams: TaskParams;
    setTaskParams: React.Dispatch<React.SetStateAction<TaskParams>>;
    onSubmit: (e: React.FormEvent) => void;
    disabled?: boolean;
    compilationResult: { success: boolean, message?: string, error?: string } | null;
}

export const IntegrationTaskForm: React.FC<TaskFormProps> = ({
    taskParams,
    setTaskParams,
    onSubmit,
    disabled,
    compilationResult
}) => {
    const calculateTaskComplexity = (params: TaskParams) => {
        if (params.method !== 'trapezoidal' || typeof params.dx !== 'number') return 0.1;
        const steps = Math.abs((params.b - params.a) / params.dx);
        const stepsComplexity = Math.log10(Math.max(1, steps)) / 3;
        return Math.min(10, Math.max(0.1, stepsComplexity));
    };

    const handleSubmitWithValidation = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(e);
    };

    return (
        <Paper withBorder p="md" radius="md" bg="dark.7" c="white">
            <Title order={4} mb="md">
                <Group gap="xs">
                    <IconCalculator size={20} />
                    <span>Całkowanie metodą trapezów</span>
                </Group>
                <Text c="dimmed" size="sm" mb="md">
                    Obciążenie: {calculateTaskComplexity(taskParams).toFixed(1)}
                </Text>
            </Title>
            <form onSubmit={handleSubmitWithValidation}>
                <Stack gap="md">
                    <Card withBorder radius="md" shadow="sm" p="md">
                        <Stack gap="sm">
                            <Group justify="space-between" align="center">
                                <Title order={5} c="white" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <IconFunction size={18} color="white" />
                                    Własna funkcja do całkowania

                                </Title>
                                {compilationResult && (
                                    <Badge
                                        color={compilationResult.success ? "#82c91e" : "red"}
                                        variant="light"
                                        leftSection={compilationResult.success ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
                                        style={{ alignSelf: "flex-start" }}
                                    >
                                        {compilationResult.success ? "Skompilowano" : "Błąd kompilacji"}
                                    </Badge>
                                )}
                            </Group>

                            <Textarea
                                value={taskParams.customFunction || ""}
                                onChange={(e) => setTaskParams(p => ({ ...p, customFunction: e.target.value }))}
                                placeholder="f(x)"
                                minRows={2}
                                maxRows={4}
                                disabled={disabled}
                                autosize
                                required
                            />
                        </Stack>
                    </Card>

                    <Group grow c="white">
                        <NumberInput
                            label="Zakres a"
                            name="a"
                            value={taskParams.a}
                            onChange={(val) => setTaskParams(p => ({ ...p, a: typeof val === "number" ? val : 0 }))}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                        <NumberInput
                            label="Zakres b"
                            name="b"
                            value={taskParams.b}
                            onChange={(val) => setTaskParams(p => ({ ...p, b: typeof val === "number" ? val : 0 }))}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                        <NumberInput
                            label="Krok dx"
                            name="dx"
                            value={taskParams.dx}
                            onChange={(val) => setTaskParams(p => ({ ...p, dx: typeof val === "number" ? val : 0.00001 }))}
                            step={0.00001}
                            decimalScale={10}
                            disabled={disabled}
                            required
                            radius="md"
                            min={0.0000000001}
                        />
                    </Group>
                    <NumberInput
                        label="Ilość zadań (N)"
                        name="N"
                        description="Całkowita liczba zadań do podziału między workerów."
                        value={taskParams.N}
                        onChange={(val) => setTaskParams(p => ({ ...p, N: typeof val === "number" ? val : 1000 }))}
                        disabled={disabled}
                        required
                        radius="md"
                        min={1}
                    />
                    <Transition mounted={!disabled} transition="slide-up" duration={400}>
                        {(styles) => (
                            <Button
                                type="submit"
                                fullWidth
                                mt="sm"
                                size="md"
                                disabled={disabled || !taskParams.customFunction || taskParams.customFunction.trim() === ""}
                                style={styles}
                                leftSection={<IconPlayerPlay size={16} />}
                                color="violet.6"
                                radius="md"
                            >
                                Start
                            </Button>
                        )}
                    </Transition>
                </Stack>
            </form>
        </Paper>
    );
}