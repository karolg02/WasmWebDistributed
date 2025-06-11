import React, { useState } from "react";
import { CustomParams1D, CustomParams2D } from "../../types";
import { Button, Paper, Stack, Title, NumberInput, Group, Text, FileInput, Alert, ActionIcon } from "@mantine/core";
import { IconFunction, IconPlayerPlay, IconUpload, IconAlertCircle, IconPlus, IconTrash } from "@tabler/icons-react";

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
    const [wasmFile, setWasmFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!wasmFile) {
            setUploadError("Musisz przesłać plik WASM");
            return;
        }

        if (!wasmFile.name.endsWith('.wasm')) {
            setUploadError("Plik WASM musi mieć rozszerzenie .wasm");
            return;
        }

        setUploadError(null);
        onSubmit(e);
    };

    const getParam = (index: number, defaultValue: number = 0): number => {
        return taskParams.params[index] ?? defaultValue;
    };

    const updateParam = (index: number, value: number) => {
        (setTaskParams as any)((prev: any) => {
            const newParams = [...prev.params];
            newParams[index] = value;
            return { ...prev, params: newParams };
        });
    };

    const addParam = () => {
        (setTaskParams as any)((prev: any) => ({
            ...prev,
            params: [...prev.params, 0]
        }));
    };

    const removeParam = (index: number) => {
        (setTaskParams as any)((prev: any) => ({
            ...prev,
            params: prev.params.filter((_: any, i: number) => i !== index)
        }));
    };

    const x1Index = 0;
    const x2Index = 1;
    const y1Index = is2D ? 2 : -1;
    const y2Index = is2D ? 3 : -1;
    const nIndex = is2D ? 4 : 2;
    const dxIndex = is2D ? 5 : 3;
    const dyIndex = is2D ? 6 : -1;
    const additionalStartIndex = is2D ? 7 : 4;

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
                    {uploadError && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="Błąd przesyłania"
                            color="red"
                            withCloseButton
                            onClose={() => setUploadError(null)}
                        >
                            {uploadError}
                        </Alert>
                    )}

                    <FileInput
                        label="Plik WASM"
                        description="Przesyłany plik .wasm z skompilowaną funkcją 'main_function'"
                        placeholder="Wybierz plik .wasm"
                        accept=".wasm"
                        value={wasmFile}
                        onChange={setWasmFile}
                        leftSection={<IconUpload size={14} />}
                        disabled={disabled}
                        required
                    />

                    <Text size="sm" c="dimmed">
                        <strong>Parametry:</strong> {is2D ? '[x1, x2, y1, y2, N, dx, dy, ...dodatkowe]' : '[x1, x2, N, dx, ...dodatkowe]'}
                    </Text>

                    <Group grow>
                        <NumberInput
                            label="x1"
                            value={getParam(x1Index, 0)}
                            onChange={(val) => updateParam(x1Index, Number(val) || 0)}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                        <NumberInput
                            label="x2"
                            value={getParam(x2Index, 1)}
                            onChange={(val) => updateParam(x2Index, Number(val) || 1)}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                    </Group>

                    {is2D && (
                        <Group grow>
                            <NumberInput
                                label="y1"
                                value={getParam(y1Index, 0)}
                                onChange={(val) => updateParam(y1Index, Number(val) || 0)}
                                disabled={disabled}
                                required
                                radius="md"
                            />
                            <NumberInput
                                label="y2"
                                value={getParam(y2Index, 1)}
                                onChange={(val) => updateParam(y2Index, Number(val) || 1)}
                                disabled={disabled}
                                required
                                radius="md"
                            />
                        </Group>
                    )}

                    <Group grow>
                        <NumberInput
                            label="Liczba zadań (N)"
                            value={getParam(nIndex, 100)}
                            onChange={(val) => updateParam(nIndex, Number(val) || 100)}
                            min={1}
                            max={100000}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                        <NumberInput
                            label="dx"
                            value={getParam(dxIndex, 0.001)}
                            onChange={(val) => updateParam(dxIndex, Number(val) || 0.001)}
                            min={0.000000001}
                            max={100}
                            step={0.001}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                    </Group>

                    {is2D && (
                        <NumberInput
                            label="dy"
                            value={getParam(dyIndex, 0.001)}
                            onChange={(val) => updateParam(dyIndex, Number(val) || 0.001)}
                            min={0.000001}
                            step={0.001}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                    )}

                    {/* Dodatkowe parametry */}
                    <Group justify="space-between">
                        <Text fw={500}>Dodatkowe parametry</Text>
                        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addParam} disabled={disabled} color="green">
                            Dodaj
                        </Button>
                    </Group>

                    {taskParams.params.length > additionalStartIndex ? (
                        <Stack gap="sm">
                            {taskParams.params.slice(additionalStartIndex).map((param, index) => (
                                <Group key={additionalStartIndex + index} gap="sm">
                                    <NumberInput
                                        label={`Parametr ${index + 1}`}
                                        value={param}
                                        onChange={(val) => updateParam(additionalStartIndex + index, Number(val) || 0)}
                                        disabled={disabled}
                                        radius="md"
                                        style={{ flex: 1 }}
                                    />
                                    <ActionIcon
                                        color="red"
                                        variant="light"
                                        onClick={() => removeParam(additionalStartIndex + index)}
                                        disabled={disabled}
                                        mt="xl"
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            ))}
                        </Stack>
                    ) : (
                        <Text size="sm" c="dimmed" ta="center">Brak dodatkowych parametrów</Text>
                    )}

                    <Button
                        type="submit"
                        fullWidth
                        size="md"
                        disabled={disabled || !wasmFile}
                        leftSection={<IconPlayerPlay size={16} />}
                        color="violet.6"
                    >
                        Uruchom {is2D ? '2D' : '1D'}
                    </Button>
                </Stack>
            </form>
        </Paper>
    );
};