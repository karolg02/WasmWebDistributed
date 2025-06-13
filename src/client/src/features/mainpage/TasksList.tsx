import { Card, Group, Badge, Image, Text, SimpleGrid, Title, Box, Center } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { IconCube, IconBoxMultiple, IconArrowRight } from "@tabler/icons-react";

interface Task {
    id: number;
    name: string;
    description: string;
    image?: string;
    badge?: string;
    dest: string;
    method?: string;
    icon?: React.ReactNode;
}

export function TasksList() {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const tasks: Task[] = [
        {
            id: 1,
            name: "WASM 1D",
            description: "Stwórz własne zadanie obliczeniowe w jednowymiarowej przestrzeni używając kodu WASM. Idealne do obliczeń liniowych i szeregów.",
            image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            badge: "1D",
            dest: "/client",
            method: "custom1D",
            icon: <IconCube size={28} color="white" />
        },
        {
            id: 2,
            name: "WASM 2D",
            description: "Stwórz własne zadanie obliczeniowe w dwuwymiarowej przestrzeni używając kodu WASM. Perfekt do symulacji i analiz powierzchniowych.",
            image: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            badge: "2D",
            dest: "/client",
            method: "custom2D",
            icon: <IconBoxMultiple size={28} color="white" />
        }
    ];

    const handleTaskSelect = (dest: string, method?: string) => {
        navigate(dest, { state: { method } });
    };

    return (
        <Box>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" maw={1000} mx="auto">
                {tasks.map((task) => (
                    <Card
                        key={task.id}
                        shadow="xl"
                        padding="xl"
                        radius="xl"
                        onMouseEnter={() => setHoveredCard(task.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={{
                            cursor: 'pointer',
                            background: 'rgba(26, 27, 30, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.4s ease',
                            transform: hoveredCard === task.id ? 'translateY(-15px) scale(1.05)' : 'none',
                            boxShadow: hoveredCard === task.id ?
                                '0 25px 80px rgba(121, 80, 242, 0.4), 0 0 60px rgba(255, 255, 255, 0.1)' :
                                '0 10px 40px rgba(0, 0, 0, 0.3)',
                        }}
                        onClick={() => handleTaskSelect(task.dest || "/client", task.method)}
                    >
                        <Card.Section>
                            <Box style={{ position: 'relative', overflow: 'hidden' }}>
                                <Image
                                    src={task.image}
                                    height={220}
                                    alt={task.name}
                                    style={{
                                        transition: 'transform 0.4s ease',
                                        transform: hoveredCard === task.id ? 'scale(1.1)' : 'scale(1)',
                                    }}
                                />
                                <Box
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: hoveredCard === task.id ?
                                            'linear-gradient(45deg, rgba(121, 80, 242, 0.3), rgba(151, 117, 250, 0.3))' :
                                            'linear-gradient(45deg, rgba(121, 80, 242, 0.1), rgba(151, 117, 250, 0.1))',
                                        transition: 'background 0.4s ease',
                                    }}
                                />

                                {/* Floating Badge */}
                                <Box
                                    style={{
                                        position: 'absolute',
                                        top: '15px',
                                        right: '15px',
                                        background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                                        borderRadius: '20px',
                                        padding: '8px 16px',
                                        color: 'white',
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        boxShadow: '0 4px 16px rgba(121, 80, 242, 0.4)',
                                    }}
                                >
                                    {task.badge}
                                </Box>
                            </Box>
                        </Card.Section>

                        <Group justify="space-between" mt="xl" mb="md">
                            <Group gap="sm">
                                <Box
                                    style={{
                                        background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                                        borderRadius: '12px',
                                        padding: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {task.icon}
                                </Box>
                                <Title order={3} c="white" size="1.5rem">
                                    {task.name}
                                </Title>
                            </Group>

                            <Box
                                style={{
                                    opacity: hoveredCard === task.id ? 1 : 0,
                                    transform: hoveredCard === task.id ? 'translateX(0)' : 'translateX(-10px)',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                <IconArrowRight size={24} color="#7950f2" />
                            </Box>
                        </Group>

                        <Text size="md" c="rgba(255, 255, 255, 0.8)" lh={1.6} mb="lg">
                            {task.description}
                        </Text>

                        <Group justify="center" mt="auto">
                            <Box
                                style={{
                                    width: '100%',
                                    height: '3px',
                                    background: hoveredCard === task.id ?
                                        'linear-gradient(90deg, #7950f2, #9775fa)' :
                                        'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '2px',
                                    transition: 'background 0.3s ease',
                                }}
                            />
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>
        </Box>
    );
}