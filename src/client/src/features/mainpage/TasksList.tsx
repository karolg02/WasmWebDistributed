import { Card, Group, Badge, Button, Image, Text, SimpleGrid, Title, Transition } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";
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
            name: "Całkowanie - Metoda trapezów",
            description: "Numeryczne całkowanie dowolnej funkcji przy użyciu metody trapezów. Zadanie może być podzielone na wiele mniejszych zadań i rozdzielone między przeglądarki.",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3",
            badge: "Matematyka",
            dest: "/client",
            method: "trapezoidal"
        },
        // {
        //     id: 2,
        //     name: "Całkowanie sin(x) - Monte Carlo",
        //     description: "Numeryczne całkowanie funkcji sin(x) przy użyciu metody Monte Carlo. Próbkowanie losowych punktów dla przybliżonego obliczenia całki.",
        //     image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3",
        //     badge: "Matematyka",
        //     dest: "/client",
        //     method: "montecarlo"
        // },
        // {
        //     id: 3,
        //     name: "Równania różniczkowe",
        //     description: "Numeryczne rozwiązywanie równań różniczkowych przy użyciu różnych metod numerycznych.",
        //     image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3",
        //     badge: "Matematyka",
        //     dest: "/client",
        //     method: "dunno"
        // },
    ];

    const handleTaskSelect = (dest: string, method?: string) => {
        if (socket) {
            navigate(dest, { state: { method } });
        } else {
            navigate(dest, { state: { method } });
        }
    };

    return (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {tasks.map((task) => (
                <Card
                    key={task.id}
                    shadow="md"
                    padding="lg"
                    radius="md"
                    withBorder
                    bg="dark.7"
                    onMouseEnter={() => setHoveredCard(task.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{
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

                    <Transition mounted={hoveredCard === task.id} transition="fade" duration={200}>
                        {(styles) => (
                            <Button
                                color="violet.6"
                                fullWidth
                                mt="md"
                                radius="md"
                                style={styles}
                                onClick={() => handleTaskSelect(task.dest || "/client", task.method)}
                                rightSection={<IconArrowRight size={16} />}
                                disabled={task.dest === "/brak"}
                            >
                                Wybierz zadanie
                            </Button>
                        )}
                    </Transition>
                </Card>
            ))}
        </SimpleGrid>
    );
}