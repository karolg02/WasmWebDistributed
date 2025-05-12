import React from "react";
import { Stack, Group, NumberInput, Button } from "@mantine/core";
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
    <form onSubmit={onSubmit}>
        <Stack gap="sm">
            <Group grow>
                <NumberInput
                    label="Zakres a"
                    name="a"
                    value={taskParams.a}
                    onChange={(val) => setTaskParams(p => ({ ...p, a: typeof val === "number" ? val : 0 }))}
                    disabled={disabled}
                    required
                />
                <NumberInput
                    label="Zakres b"
                    name="b"
                    value={taskParams.b}
                    onChange={(val) => setTaskParams(p => ({ ...p, b: typeof val === "number" ? val : 0 }))}
                    disabled={disabled}
                    required
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
            />
            <NumberInput
                label="Ilość zadań"
                name="N"
                value={taskParams.N}
                onChange={(val) => setTaskParams(p => ({ ...p, N: typeof val === "number" ? val : 0 }))}
                disabled={disabled}
                required
            />
            <Button type="submit" fullWidth mt="sm" size="md" disabled={disabled}>
                Start
            </Button>
        </Stack>
    </form>
);