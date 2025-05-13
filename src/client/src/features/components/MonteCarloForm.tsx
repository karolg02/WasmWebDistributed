import React from "react";
import { Stack, Group, NumberInput, Button, Paper, Title, Transition } from "@mantine/core";
import { IconCalculator, IconPlayerPlay } from "@tabler/icons-react";

interface MonteCarloParams {
    a: number;
    b: number;
    samples: number;
    y_max: number;
    N: number;
}

interface MonteCarloFormProps {
    taskParams: MonteCarloParams;
    setTaskParams: React.Dispatch<React.SetStateAction<MonteCarloParams>>;
    onSubmit: (e: React.FormEvent) => void;
    disabled?: boolean;
}

export const MonteCarloForm: React.FC<MonteCarloFormProps> = ({
    taskParams,
    setTaskParams,
    onSubmit,
    disabled
}) => (
    <Paper withBorder p="md" radius="md" bg="dark.7">
        <Title order={4} mb="md">
            <Group gap="xs">
                <IconCalculator size={20} />
                <span>Parametry zadania - Monte Carlo</span>
            </Group>
        </Title>
        <form onSubmit={onSubmit}>
            <Stack gap="md">
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
                    label="Liczba próbek na zadanie"
                    name="samples"
                    value={taskParams.samples}
                    onChange={(val) => setTaskParams(p => ({ ...p, samples: typeof val === "number" ? val : 10000 }))}
                    min={1000}
                    step={1000}
                    disabled={disabled}
                    required
                    radius="md"
                />
                <NumberInput
                    label="Maksymalna wartość Y"
                    name="y_max"
                    value={taskParams.y_max}
                    onChange={(val) => setTaskParams(p => ({
                        ...p,
                        y_max: typeof val === "number" ? Math.min(val, 1.0) : 1.0
                    }))}
                    defaultValue={1.0}
                    max={1.0}
                    description="Dla sin(x) maksymalna wartość to 1.0"
                    disabled={disabled}
                    required
                    radius="md"
                />
                <NumberInput
                    label="Ilość zadań"
                    name="N"
                    value={taskParams.N}
                    onChange={(val) => setTaskParams(p => ({ ...p, N: typeof val === "number" ? val : 100 }))}
                    disabled={disabled}
                    required
                    radius="md"
                />
                <Transition mounted={!disabled} transition="slide-up" duration={400}>
                    {(styles) => (
                        <Button
                            type="submit"
                            fullWidth
                            mt="sm"
                            size="md"
                            disabled={disabled}
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