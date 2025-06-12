import { Container, Title, Text, Space, Card, Group, Image } from "@mantine/core";
import { TasksList } from "./TasksList";
import { useState } from "react";

export function MainPage() {
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    return (
        <Container size="xl" py="lg">
            <TasksList />
            <Space h="xl" />
            <Title order={2} mb="md" c="#82c91e">Nie wiesz jak przygotować plik WASM?</Title>
            <Card
                shadow="xl"
                padding="xl"
                radius="lg"
                bg="linear-gradient(135deg, #343a40 0%, #212529 100%)"
                onMouseEnter={() => setHoveredCard(1)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    transform: hoveredCard ? 'translateY(-5px)' : 'none',
                    boxShadow: hoveredCard ? '0 8px 16px rgba(0, 0, 0, 0.3)' : undefined
                }}
                onClick={() => console.log('Card clicked')}
            >
                <Card.Section>
                    <Image
                        src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                        height={200}
                        alt="WebAssembly kod"
                    />
                </Card.Section>
                <Group justify="space-between" mt="md" mb="xs">
                    <Title order={2} mt="md" mb="xs" c="white">
                        Instrukcja WASM
                    </Title>
                </Group>
                <Text size="md" c="gray.3" mb="sm" lineClamp={3}>
                    Dowiedz się jak skompilować kod C/C++ do formatu WebAssembly i przygotować funkcje do obliczeń rozproszonych.
                </Text>
            </Card>
        </Container>
    );
}