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
            name: "Stwórz własne zadanie",
            description: "Numeryczne rozwiązywanie równań różniczkowych przy użyciu różnych metod numerycznych.",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3",
            badge: "Create",
            dest: "/client",
            method: "custom"
        },
        {
            id: 2,
            name: "Całkowanie - Metoda trapezów",
            description: "Numeryczne całkowanie dowolnej funkcji przy użyciu metody trapezów. Zadanie może być podzielone na wiele mniejszych zadań i rozdzielone między przeglądarki.",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3",
            badge: "Matematyka",
            dest: "/client",
            method: "trapezoidal"
        },
        {
            id: 3,
            name: "Całkowanie - Monte Carlo",
            description: "Numeryczne całkowanie dowolnej funkcji przy użyciu metody Monte Carlo. Próbkowanie losowych punktów dla przybliżonego obliczenia całki.",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3",
            badge: "Matematyka",
            dest: "/client",
            method: "montecarlo"
        },
    ];

    const handleTaskSelect = (dest: string, method?: string) => {
        if (socket) {
            navigate(dest, { state: { method } });
        } else {
            navigate(dest, { state: { method } });
        }
    };

    return (
        <>
            <Card
                key={tasks[0].id}
                shadow="xl"
                padding="xl"
                radius="lg"
                bg="linear-gradient(135deg, #343a40 0%, #212529 100%)"
                mb="xl"
                onMouseEnter={() => setHoveredCard(tasks[0].id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    transform: hoveredCard === tasks[0].id ? 'translateY(-5px)' : 'none',
                    boxShadow: hoveredCard === tasks[0].id ? '0 8px 16px rgba(0, 0, 0, 0.3)' : undefined
                }}
                onClick={() => handleTaskSelect(tasks[0].dest || "/client", tasks[0].method)}
            >
                <Card.Section>
                    <Image
                        src={tasks[0].image}
                        height={200}
                        alt={tasks[0].name}
                    />
                </Card.Section>
                <Group justify="space-between" mt="md" mb="xs">
                    <Title order={2} mt="md" mb="xs">
                        {tasks[0].name}

                    </Title>
                    {tasks[0].badge && (
                        <Badge color="#82c91e" size="xl" variant="light">
                            {tasks[0].badge}
                        </Badge>
                    )}
                </Group>
                <Text size="md" c="gray.3" mb="sm" lineClamp={3}>
                    {tasks[0].description}
                </Text>
            </Card>
            <Title order={1} mb="lg" c="#82c91e">Przetestuj przykładowe kody WASM</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                {tasks.slice(1).map((task) => (
                    <Card
                        key={task.id}
                        shadow="md"
                        padding="lg"
                        radius="md"
                        bg="dark.7"
                        onMouseEnter={() => setHoveredCard(task.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => handleTaskSelect(task.dest || "/client", task.method)}
                        style={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            transform: hoveredCard === task.id ? 'translateY(-5px)' : 'none',
                            boxShadow: hoveredCard === task.id ? '0 8px 16px rgba(0, 0, 0, 0.3)' : undefined
                        }}
                    >
                        <Card.Section>
                            <Image
                                src={task.image}
                                height={160}
                                alt={task.name}
                            />
                        </Card.Section>

                        <Group space-between="apart" mt="md" mb="xs">
                            <Title order={3} size="h4" fw={500} c="white">{task.name}</Title>
                            {task.badge && (
                                <Badge color="#82c91e" variant="light">{task.badge}</Badge>
                            )}
                        </Group>

                        <Text size="sm" c="dimmed" mb="xl" lineClamp={3}>
                            {task.description}
                        </Text>
                    </Card>
                ))}
            </SimpleGrid>
        </>);
}