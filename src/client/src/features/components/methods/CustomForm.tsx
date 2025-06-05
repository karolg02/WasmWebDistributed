import React, { useState } from "react";
import { CustomParams1D, CustomParams2D } from "../../types";
import { Button, Paper, Stack, Title, NumberInput, Group, Text, FileInput, Alert } from "@mantine/core";
import { IconFunction, IconPlayerPlay, IconUpload, IconAlertCircle } from "@tabler/icons-react";

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
    const [jsFile, setJsFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!wasmFile || !jsFile) {
            setUploadError("Musisz przesłać oba pliki: WASM i JS loader");
            return;
        }

        if (!wasmFile.name.endsWith('.wasm')) {
            setUploadError("Plik WASM musi mieć rozszerzenie .wasm");
            return;
        }

        if (!jsFile.name.endsWith('.js')) {
            setUploadError("Plik JS musi mieć rozszerzenie .js");
            return;
        }

        setUploadError(null);

        // Dodaj pliki do FormData
        const formData = new FormData(e.target as HTMLFormElement);
        if (wasmFile) formData.set('wasmFile', wasmFile);
        if (jsFile) formData.set('jsFile', jsFile);

        onSubmit(e);
    };

    const updateParams = (updates: Partial<CustomParams1D | CustomParams2D>) => {
        (setTaskParams as any)((p: any) => ({ ...p, ...updates }));
    };

    const handleWasmFileChange = (file: File | null) => {
        setWasmFile(file);
        if (file) {
            updateParams({ wasmSource: file.name });
        }
    };

    const handleJsFileChange = (file: File | null) => {
        setJsFile(file);
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

                    {/* Ukryte inputy dla FormData */}
                    <input type="hidden" name="wasmFile" />
                    <input type="hidden" name="jsFile" />

                    <FileInput
                        label="Plik WASM"
                        description="Przesyłany plik .wasm z skompilowaną funkcją"
                        placeholder="Wybierz plik .wasm"
                        accept=".wasm"
                        value={wasmFile}
                        onChange={handleWasmFileChange}
                        leftSection={<IconUpload size={14} />}
                        disabled={disabled}
                        required
                    />

                    <FileInput
                        label="Plik JS Loader"
                        description="Plik .js z loaderem do obsługi WASM"
                        placeholder="Wybierz plik .js"
                        accept=".js"
                        value={jsFile}
                        onChange={handleJsFileChange}
                        leftSection={<IconUpload size={14} />}
                        disabled={disabled}
                        required
                    />

                    <Text size="sm" c="dimmed">
                        <strong>Wymagania dla pliku JS:</strong><br />
                        - Musi eksportować moduł WASM zgodny z Emscripten<br />
                        - Funkcje dostępne przez ccall: 'main_function'
                    </Text>

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
                        disabled={disabled || !wasmFile || !jsFile}
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