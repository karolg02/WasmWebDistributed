import React from "react";
import {
    Stack,
    Group,
    NumberInput,
    Button,
    Paper,
    Title,
    Transition,
    Textarea,
    Badge,
    Card
} from "@mantine/core";
import { IconCalculator, IconPlayerPlay, IconFunction, IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { TaskParams } from "../types";

interface MonteCarloFormProps {
    taskParams: TaskParams;
    setTaskParams: React.Dispatch<React.SetStateAction<TaskParams>>;
    onSubmit: (e: React.FormEvent) => void;
    disabled?: boolean;
    compilationResult: { success: boolean, message?: string, error?: string } | null;
}

export const MonteCarloForm: React.FC<MonteCarloFormProps> = ({
    taskParams,
    setTaskParams,
    onSubmit,
    disabled,
    compilationResult
}) => {

    return (
        <Paper withBorder p="md" radius="md" bg="dark.7">
            <Title order={4} mb="md">
                <Group gap="xs">
                    <IconCalculator size={20} />
                    <span>Całkowanie Metodą Monte Carlo</span>
                </Group>
            </Title>
            <form onSubmit={onSubmit}>
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
                    <Group grow>
                        <NumberInput
                            label="Zakres a"
                            name="a"
                            value={taskParams.a}
                            onChange={(val) => setTaskParams(p => ({ ...p, method: 'montecarlo', a: typeof val === "number" ? val : 0 }))}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                        <NumberInput
                            label="Zakres b"
                            name="b"
                            value={taskParams.b}
                            onChange={(val) => setTaskParams(p => ({ ...p, method: 'montecarlo', b: typeof val === "number" ? val : 0 }))}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                    </Group>
                    <NumberInput
                        label="Liczba próbek na zadanie"
                        name="samples"
                        value={taskParams.samples}
                        onChange={(val) => setTaskParams(p => ({ ...p, method: 'montecarlo', samples: typeof val === "number" ? val : 10000 }))}
                        min={1000}
                        step={1000}
                        disabled={disabled}
                        required
                        radius="md"
                    />
                    <NumberInput
                        label="Maksymalna wartość Y (do 1.0)"
                        name="y_max"
                        value={taskParams.y_max}
                        onChange={(val) => setTaskParams(p => ({
                            ...p,
                            method: 'montecarlo',
                            y_max: typeof val === "number" ? Math.min(val, 1.0) : 1.0
                        }))}
                        decimalScale={2}
                        step={0.1}
                        max={1.0}
                        min={0.01}
                        description="Maksymalna oczekiwana wartość funkcji w przedziale."
                        disabled={disabled}
                        required
                        radius="md"
                    />
                    <NumberInput
                        label="Ilość zadań (N)"
                        name="N"
                        description="Całkowita liczba zadań do podziału między workerów."
                        value={taskParams.N}
                        onChange={(val) => setTaskParams(p => ({ ...p, method: 'montecarlo', N: typeof val === "number" ? val : 100 }))}
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
};