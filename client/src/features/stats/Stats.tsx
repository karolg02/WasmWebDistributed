import React, { useState, useEffect } from "react";
import { Container, Paper, Title, Text, Group, Box, RingProgress, Center, Loader, Alert, SimpleGrid } from "@mantine/core";
import { IconCheck, IconX, IconClock, IconTrendingUp, IconAlertCircle } from "@tabler/icons-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { API_URL } from "../../config";

interface SystemStats {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    pendingTasks: number;
    runningTasks: number;
    totalUsers: number;
    avgTaskDuration: number;
    tasksPerMethod: Array<{ method: string; count: number }>;
    tasksPerDay: Array<{ date: string; count: number }>;
}

const COLORS = ['#51cf66', '#ff6b6b', '#339af0', '#ffd43b'];

export function Stats() {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${API_URL}/api/monitoring/stats`);
                
                if (!response.ok) {
                    throw new Error('Nie udało się pobrać statystyk');
                }

                const data = await response.json();
                setStats(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Nieznany błąd');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <Container size="lg" py="xl">
                <Center h={400}>
                    <Loader size="xl" color="violet" />
                </Center>
            </Container>
        );
    }

    if (error || !stats) {
        return (
            <Container size="lg" py="xl">
                <Alert icon={<IconAlertCircle />} color="red" title="Błąd">
                    {error || 'Brak danych'}
                </Alert>
            </Container>
        );
    }

    const pieData = [
        { name: 'Ukończone', value: stats.completedTasks, color: '#51cf66' },
        { name: 'Nieudane', value: stats.failedTasks, color: '#ff6b6b' },
        { name: 'W trakcie', value: stats.runningTasks, color: '#339af0' },
        { name: 'Oczekujące', value: stats.pendingTasks, color: '#ffd43b' },
    ];

    const methodData = stats.tasksPerMethod || [];

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(0);
        return `${minutes}m ${secs}s`;
    };

    return (
        <Container size="xl" py="xl" className="fade-in">
            <Title
                order={1}
                size="2.5rem"
                mb="xl"
                ta="center"
                style={{
                    background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}
            >
                Statystyki systemu
            </Title>

            {/* Karty z głównymi statystykami */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mb="xl">
                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: 'rgba(26, 27, 30, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <Group justify="space-between">
                        <Box>
                            <Text size="sm" c="dimmed" mb="xs">
                                Wszystkie zadania
                            </Text>
                            <Text size="2rem" fw={700} c="white">
                                {stats.totalTasks.toLocaleString()}
                            </Text>
                        </Box>
                        <IconTrendingUp size={48} color="#7950f2" />
                    </Group>
                </Paper>

                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: 'rgba(26, 27, 30, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <Group justify="space-between">
                        <Box>
                            <Text size="sm" c="dimmed" mb="xs">
                                Ukończone
                            </Text>
                            <Text size="2rem" fw={700} c="#51cf66">
                                {stats.completedTasks.toLocaleString()}
                            </Text>
                        </Box>
                        <IconCheck size={48} color="#51cf66" />
                    </Group>
                </Paper>

                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: 'rgba(26, 27, 30, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <Group justify="space-between">
                        <Box>
                            <Text size="sm" c="dimmed" mb="xs">
                                Nieudane
                            </Text>
                            <Text size="2rem" fw={700} c="#ff6b6b">
                                {stats.failedTasks.toLocaleString()}
                            </Text>
                        </Box>
                        <IconX size={48} color="#ff6b6b" />
                    </Group>
                </Paper>

                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: 'rgba(26, 27, 30, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <Group justify="space-between">
                        <Box>
                            <Text size="sm" c="dimmed" mb="xs">
                                Średni czas
                            </Text>
                            <Text size="2rem" fw={700} c="white">
                                {formatDuration(stats.avgTaskDuration || 0)}
                            </Text>
                        </Box>
                        <IconClock size={48} color="#7950f2" />
                    </Group>
                </Paper>
            </SimpleGrid>

            {/* Wykresy */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* Wykres kołowy - rozkład statusów */}
                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: 'rgba(26, 27, 30, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <Title order={3} c="white" mb="lg" ta="center">
                        Rozkład statusów zadań
                    </Title>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(26, 27, 30, 0.9)', 
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white'
                                }} 
                            />
                            <Legend 
                                verticalAlign="bottom"
                                align="center"
                                layout="horizontal"
                                wrapperStyle={{ 
                                    paddingTop: '20px',
                                    color: 'white'
                                }}
                                formatter={(value: string, entry: any) => {
                                    const item = pieData.find(d => d.name === value);
                                    const total = pieData.reduce((sum, d) => sum + d.value, 0);
                                    const percent = total > 0 ? ((item?.value || 0) / total * 100).toFixed(0) : 0;
                                    return <span style={{ color: entry.color }}>{value} ({percent}%)</span>;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </Paper>

                {/* Wykres słupkowy - zadania według metod */}
                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: 'rgba(26, 27, 30, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <Title order={3} c="white" mb="lg" ta="center">
                        Zadania według metody
                    </Title>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={methodData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="method" stroke="rgba(255,255,255,0.7)" />
                            <YAxis stroke="rgba(255,255,255,0.7)" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(26, 27, 30, 0.9)', 
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white'
                                }} 
                            />
                            <Legend wrapperStyle={{ color: 'white' }} />
                            <Bar dataKey="count" fill="#7950f2" name="Liczba zadań" />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            </SimpleGrid>

            {/* Statystyki sukcesu */}
            <Paper
                p="xl"
                radius="xl"
                mt="xl"
                style={{
                    background: 'rgba(26, 27, 30, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <Title order={3} c="white" mb="lg" ta="center">
                    Wskaźnik powodzenia
                </Title>
                <Center>
                    <RingProgress
                        size={250}
                        thickness={24}
                        sections={[
                            { 
                                value: stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0, 
                                color: 'green' 
                            },
                        ]}
                        label={
                            <Box ta="center">
                                <Text size="3rem" fw={700} c="white">
                                    {stats.totalTasks > 0 
                                        ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1) 
                                        : '0'}%
                                </Text>
                                <Text size="sm" c="dimmed">
                                    Zadań ukończonych pomyślnie
                                </Text>
                            </Box>
                        }
                    />
                </Center>
            </Paper>
        </Container>
    );
}
