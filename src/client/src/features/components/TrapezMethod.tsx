import React from "react";
import { Stack, Group, NumberInput, Button, Paper, Title, Transition } from "@mantine/core";
import { IconCalculator, IconPlayerPlay } from "@tabler/icons-react";
import { TaskParams } from "../types";

interface TaskFormProps {
    taskParams: TaskParams;
    setTaskParams: React.Dispatch<React.SetStateAction<TaskParams>>;
    onSubmit: (e: React.FormEvent) => void;
    disabled?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({
    taskParams,
    setTaskParams,
    onSubmit,
    disabled
}) => (
    <Paper withBorder p="md" radius="md" bg="dark.7">
        <Title order={4} mb="md">
            <Group gap="xs">
                <IconCalculator size={20} />
                <span>Parametry zadania</span>
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
                    label="Krok dx"
                    name="dx"
                    value={taskParams.dx}
                    onChange={(val) => setTaskParams(p => ({ ...p, dx: typeof val === "number" ? val : 0 }))}
                    step={0.00001}
                    disabled={disabled}
                    required
                    radius="md"
                />
                <NumberInput
                    label="Ilość zadań"
                    name="N"
                    value={taskParams.N}
                    onChange={(val) => setTaskParams(p => ({ ...p, N: typeof val === "number" ? val : 0 }))}
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