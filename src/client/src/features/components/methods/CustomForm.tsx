import React from "react";
import { CustomParams1D, CustomParams2D } from "../../types";
import { Button, Paper, Stack, Textarea, Title, NumberInput, Group, Text } from "@mantine/core";
import { IconFunction, IconPlayerPlay } from "@tabler/icons-react";

interface CustomFormProps {
    taskParams: CustomParams1D | CustomParams2D;
    setTaskParams: React.Dispatch<React.SetStateAction<CustomParams1D>> | React.Dispatch<React.SetStateAction<CustomParams2D>>;
    onSubmit: (e: React.FormEvent) => void;
    disabled?: boolean;
    is2D: boolean;
}

export const CustomForm: React.FC<CustomFormProps> = ({
    taskParams,
    setTaskParams,
    onSubmit,
    disabled,
    is2D
}) => {

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(e);
    };

    const updateParams = (updates: Partial<CustomParams1D | CustomParams2D>) => {
        (setTaskParams as any)((p: any) => ({ ...p, ...updates }));
    };

    return (
        <Paper withBorder p="md" radius="md" bg="dark.7" c="white">
            <Title order={4} mb="md">
                <Group gap="xs">
                    <IconFunction size={20} />
                    <span>Własne zadanie WASM {is2D ? '(2D)' : '(1D)'}</span>
                </Group>
            </Title>
            <form onSubmit={handleFormSubmit}>
                <Stack gap="md">
                    <Textarea
                        label="Kod WASM / Identyfikator funkcji"
                        description="Wklej kod WASM (np. w formacie Base64), tekst WAT/WAST lub podaj identyfikator predefiniowanej funkcji."
                        value={taskParams.wasmSource}
                        onChange={(e) => updateParams({ wasmSource: e.target.value })}
                        placeholder="Moduł WASM lub nazwa funkcji..."
                        minRows={4}
                        autosize
                        disabled={disabled}
                        required
                    />

                    <Text mt="sm" fw={500}>Parametry dla zadania {is2D ? '(2D)' : '(1D)'}</Text>

                    <Group grow>
                        <NumberInput
                            label="Zakres początkowy X (x1)"
                            value={taskParams.x1}
                            onChange={(val) => updateParams({ x1: Number(val) || 0 })}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                        <NumberInput
                            label="Zakres końcowy X (x2)"
                            value={taskParams.x2}
                            onChange={(val) => updateParams({ x2: Number(val) || 0 })}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                    </Group>

                    {is2D && (
                        <Group grow>
                            <NumberInput
                                label="Zakres początkowy Y (y1)"
                                value={(taskParams as CustomParams2D).y1}
                                onChange={(val) => updateParams({ y1: Number(val) || 0 })}
                                disabled={disabled}
                                required
                                radius="md"
                            />
                            <NumberInput
                                label="Zakres końcowy Y (y2)"
                                value={(taskParams as CustomParams2D).y2}
                                onChange={(val) => updateParams({ y2: Number(val) || 0 })}
                                disabled={disabled}
                                required
                                radius="md"
                            />
                        </Group>
                    )}

                    <Group grow>
                        <NumberInput
                            label="Krok X (dx)"
                            value={taskParams.dx}
                            onChange={(val) => updateParams({ dx: Number(val) || (is2D ? 0.001 : 0.00001) })}
                            step={is2D ? 0.001 : 0.00001}
                            decimalScale={10}
                            min={0.0000000001}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                        {is2D && (
                            <NumberInput
                                label="Krok Y (dy)"
                                value={(taskParams as CustomParams2D).dy}
                                onChange={(val) => updateParams({ dy: Number(val) || 0.001 })}
                                step={0.001}
                                decimalScale={10}
                                min={0.0000000001}
                                disabled={disabled}
                                required
                                radius="md"
                            />
                        )}
                    </Group>

                    <NumberInput
                        label="Liczba zadań (N)"
                        description="Całkowita liczba zadań do podziału między workerów."
                        value={taskParams.N}
                        onChange={(val) => updateParams({ N: Number(val) || 1000 })}
                        min={1}
                        disabled={disabled}
                        required
                        radius="md"
                    />

                    <Button
                        type="submit"
                        fullWidth
                        mt="sm"
                        size="md"
                        disabled={disabled || !taskParams.wasmSource || taskParams.wasmSource.trim() === ""}
                        leftSection={<IconPlayerPlay size={16} />}
                        color="violet.6"
                        radius="md"
                    >
                        Uruchom własne zadanie {is2D ? '2D' : '1D'}
                    </Button>
                </Stack>
            </form>
        </Paper>
    );
};