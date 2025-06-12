import { Card, Group, Badge, Button, Image, Text, SimpleGrid, Title, Transition } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSocket } from "../hooks/useSocket";

interface Task {
    id: number;
    name: string;
    description: string;
    image?: string;
    badge?: string;
    dest: string;
    method?: string;
}

export function TasksList() {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const { socket } = useSocket();

    const tasks: Task[] = [
        {
            id: 1,
            name: "WASM 1D",
            description: "Stwórz własne zadanie obliczeniowe w jednowymiarowej przestrzeni używając kodu WASM.",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3",
            badge: "1D",
            dest: "/client",
            method: "custom1D"
        },
        {
            id: 2,
            name: "WASM 2D",
            description: "Stwórz własne zadanie obliczeniowe w dwuwymiarowej przestrzeni używając kodu WASM.",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3",
            badge: "2D",
            dest: "/client",
            method: "custom2D"
        }
    ];

    const handleTaskSelect = (dest: string, method?: string) => {
        navigate(dest, { state: { method } });
    };

    return (
        <>
            <Title order={1} mb="xl" c="#82c91e">Dostępne tryby obliczeniowe</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                {tasks.map((task) => (
                    <Card
                        key={task.id}
                        shadow="xl"
                        padding="xl"
                        radius="lg"
                        bg="linear-gradient(135deg, #343a40 0%, #212529 100%)"
                        onMouseEnter={() => setHoveredCard(task.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            transform: hoveredCard === task.id ? 'translateY(-5px)' : 'none',
                            boxShadow: hoveredCard === task.id ? '0 8px 16px rgba(0, 0, 0, 0.3)' : undefined
                        }}
                        onClick={() => handleTaskSelect(task.dest || "/client", task.method)}
                    >
                        <Card.Section>
                            <Image
                                src={task.image}
                                height={200}
                                alt={task.name}
                            />
                        </Card.Section>
                        <Group justify="space-between" mt="md" mb="xs">
                            <Title order={2} mt="md" mb="xs">
                                {task.name}
                            </Title>
                            {task.badge && (
                                <Badge color="#82c91e" size="xl" variant="light">
                                    {task.badge}
                                </Badge>
                            )}
                        </Group>
                        <Text size="md" c="gray.3" mb="sm" lineClamp={3}>
                            {task.description}
                        </Text>
                    </Card>
                ))}
            </SimpleGrid>
        </>
    );
}