import React from "react";
import { CustomParams1D } from "../../types";
import { Button, Paper, Stack, Textarea, Title, NumberInput, Group, Text, Select } from "@mantine/core";
import { IconFunction, IconPlayerPlay } from "@tabler/icons-react";

interface CustomFormProps {
    taskParams: CustomParams1D;
    setTaskParams: React.Dispatch<React.SetStateAction<CustomParams1D>>;
    onSubmit: (e: React.FormEvent) => void;
    disabled?: boolean;
    // compilationResult?: { success: boolean, message?: string, error?: string } | null; // Optional: if you have a similar mechanism for custom WASM
}

export const CustomForm: React.FC<CustomFormProps> = ({
    taskParams,
    setTaskParams,
    onSubmit,
    disabled,
    // compilationResult
}) => {

    // Placeholder for 1D/2D selection if you expand CustomParams
    // const [dimension, setDimension] = useState<'1D' | '2D'>('1D');

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Add any specific validation for the custom form if needed
        onSubmit(e);
    };

    return (
        <Paper withBorder p="md" radius="md" bg="dark.7" c="white">
            <Title order={4} mb="md">
                <Group gap="xs">
                    <IconFunction size={20} />
                    <span>Własne zadanie WASM</span>
                </Group>
            </Title>
            <form onSubmit={handleFormSubmit}>
                <Stack gap="md">
                    {/* 
                        TODO: Implement WASM input. This could be:
                        1. A textarea for pasting WASM code (text format or base64).
                        2. A file input to upload a .wasm file.
                        3. An input for an identifier if WASM modules are pre-loaded/registered.
                        For now, `customFunction` field in `CustomParams1D` will store this.
                    */}
                    <Textarea
                        label="Kod WASM / Identyfikator funkcji"
                        description="Wklej kod WASM (np. w formacie Base64), tekst WAT/WAST lub podaj identyfikator predefiniowanej funkcji."
                        value={taskParams.wasmSource}
                        onChange={(e) => setTaskParams(p => ({ ...p, wasmSource: e.target.value }))}
                        placeholder="Moduł WASM lub nazwa funkcji..."
                        minRows={4}
                        autosize
                        disabled={disabled}
                        required
                    />

                    {/* 
                        TODO: Add a selector for 1D/2D tasks if you plan to support both.
                        <Select
                            label="Typ zadania (wymiarowość)"
                            placeholder="Wybierz typ"
                            data={[
                                { value: '1D', label: 'Zadanie 1D' },
                                // { value: '2D', label: 'Zadanie 2D' }, // Uncomment when 2D is ready
                            ]}
                            value={dimension} // You would need a 'dimension' state
                            onChange={(value) => {
                                // setDimension(value as '1D' | '2D');
                                // Potentially reset parts of taskParams or switch to a different params object
                            }}
                            disabled={disabled}
                        />
                    */}

                    <Text mt="sm" fw={500}>Parametry dla zadania (1D)</Text>
                    <Group grow>
                        <NumberInput
                            label="Zakres początkowy (x1)"
                            value={taskParams.x1}
                            onChange={(val) => setTaskParams(p => ({ ...p, x1: Number(val) || 0 }))}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                        <NumberInput
                            label="Zakres końcowy (x2)"
                            value={taskParams.x2}
                            onChange={(val) => setTaskParams(p => ({ ...p, x2: Number(val) || 0 }))}
                            disabled={disabled}
                            required
                            radius="md"
                        />
                    </Group>
                    <NumberInput
                        label="Krok (dx)"
                        value={taskParams.dx}
                        onChange={(val) => setTaskParams(p => ({ ...p, dx: Number(val) || 0.00001 }))}
                        step={0.00001}
                        decimalScale={10}
                        min={0.0000000001}
                        disabled={disabled}
                        required
                        radius="md"
                    />
                    <NumberInput
                        label="Liczba zadań (N)"
                        description="Całkowita liczba zadań do podziału między workerów."
                        value={taskParams.N}
                        onChange={(val) => setTaskParams(p => ({ ...p, N: Number(val) || 1000 }))}
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
                        Uruchom własne zadanie
                    </Button>
                </Stack>
            </form>
        </Paper>
    );
};