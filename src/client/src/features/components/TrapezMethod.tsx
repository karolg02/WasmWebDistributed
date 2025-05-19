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
    Accordion
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

export const TaskForm: React.FC<TaskFormProps> = ({
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
        <Paper withBorder p="md" radius="md" bg="dark.7">
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
                    <Accordion variant="separated" radius="md" defaultValue="custom-function">
                        <Accordion.Item value="custom-function">
                            <Accordion.Control icon={<IconFunction size={18} />}>
                                Funkcja na której ma być wykonane całkowanine
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack gap="sm">
                                    <>
                                        <Textarea
                                            value={taskParams.customFunction || ""}
                                            onChange={(e) => setTaskParams(p => ({ ...p, customFunction: e.target.value }))}
                                            placeholder=""
                                            minRows={1}
                                            maxRows={3}
                                            disabled={disabled}
                                            autosize
                                            required
                                        />
                                    </>
                                    {compilationResult && (
                                        <Alert
                                            mt="md"
                                            icon={compilationResult.success ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />}
                                            title={compilationResult.success ? "Kompilacja pomyślna" : "Błąd kompilacji"}
                                            color={compilationResult.success ? "green" : "red"}
                                            withCloseButton={!compilationResult.success}
                                        >
                                            {compilationResult.success ? compilationResult.message : compilationResult.error}
                                        </Alert>
                                    )}
                                </Stack>
                            </Accordion.Panel>
                        </Accordion.Item>
                    </Accordion>
                    <Group grow>
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
                    </Group>
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
                                disabled={disabled || !taskParams.customFunction || taskParams.customFunction.trim() === ""} // Disable if no function
                                style={styles}
                                leftSection={<IconPlayerPlay size={16} />}
                                color="cyan"
                                radius="md"
                            >
                                Start
                            </Button>
                        )}
                    </Transition>
                    <Transition mounted={!!disabled} transition="slide-up" duration={400}>
                        {(styles) => (
                            <Button
                                type="button"
                                fullWidth
                                mt="sm"
                                size="md"
                                style={styles}
                                loading
                                radius="md"
                            >
                                Obliczanie...
                            </Button>
                        )}
                    </Transition>
                </Stack>
            </form>
        </Paper>
    );
}