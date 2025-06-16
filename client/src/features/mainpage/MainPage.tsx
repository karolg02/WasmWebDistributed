import { Container, Title, Text, Space, Card, Group, Image, Box, Center } from "@mantine/core";
import { TasksList } from "./TasksList";
import { useState } from "react";
import { IconSparkles } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

export function MainPage() {
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const navigate = useNavigate();

    return (
        <Container size="xl" py="xl">
            <Box mb="xl" ta="center">
                <Title
                    order={1}
                    size="3rem"
                    mb="md"
                    style={{
                        background: 'linear-gradient(45deg, #7950f2, #9775fa, #f093fb)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textAlign: 'center'
                    }}
                >
                    Witaj w przyszłości obliczeń
                </Title>
                <Text size="xl" c="white" opacity={0.8} maw={600} mx="auto">
                    Wykorzystaj moc rozproszonych obliczeń w przeglądarce.
                    Stwórz swoje własne zadania obliczeniowe z WebAssembly.
                </Text>
            </Box>

            <TasksList />

            <Space h="xl" />

            <Title order={2} mb="xl" c="white" ta="center">
                <Group justify="center" gap="sm">
                    <IconSparkles size={32} />
                    <span>Potrzebujesz pomocy z WASM?</span>
                </Group>
            </Title>

            <Card
                shadow="xl"
                padding="xl"
                radius="xl"
                onMouseEnter={() => setHoveredCard(1)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                    cursor: 'pointer',
                    background: 'rgba(26, 27, 30, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.4s ease',
                    transform: hoveredCard ? 'translateY(-10px) scale(1.02)' : 'none',
                    boxShadow: hoveredCard ?
                        '0 20px 60px rgba(121, 80, 242, 0.3), 0 0 40px rgba(255, 255, 255, 0.1)' :
                        '0 8px 32px rgba(0, 0, 0, 0.3)',
                }}
                onClick={() => navigate('/help')}
                maw={800}
                mx="auto"
            >
                <Card.Section>
                    <Box style={{ position: 'relative', overflow: 'hidden' }}>
                        <Image
                            src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                            height={250}
                            alt="WebAssembly kod"
                            style={{
                                transition: 'transform 0.4s ease',
                                transform: hoveredCard ? 'scale(1.1)' : 'scale(1)',
                            }}
                        />
                        <Box
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: hoveredCard ?
                                    'linear-gradient(45deg, rgba(121, 80, 242, 0.2), rgba(151, 117, 250, 0.2))' :
                                    'transparent',
                                transition: 'background 0.4s ease',
                            }}
                        />
                    </Box>
                </Card.Section>

                <Group justify="space-between" mt="xl" mb="md">
                    <Title order={2} c="white" size="1.8rem">
                        <Group gap="sm">
                            <IconSparkles size={28} color="#7950f2" />
                            <span>Instrukcja WASM</span>
                        </Group>
                    </Title>
                </Group>

                <Text size="lg" c="rgba(255, 255, 255, 0.8)" lh={1.6}>
                    Dowiedz się jak skompilować kod C/C++ do formatu WebAssembly
                    i przygotować funkcje do obliczeń rozproszonych. Przewodnik krok po kroku
                    z przykładami i najlepszymi praktykami.
                </Text>

                <Group mt="xl" justify="center">
                    <Box
                        style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                            borderRadius: '20px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 500,
                        }}
                    >
                        Kliknij aby przeczytać →
                    </Box>
                </Group>
            </Card>
        </Container>
    );
}