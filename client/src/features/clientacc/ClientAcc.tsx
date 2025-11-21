import React, { useState, useEffect } from "react";
import { Container, Paper, Title, Text, Stack, Card, Group, Badge, Loader, Alert, Box, Timeline, RingProgress, Center, Pagination } from "@mantine/core";
import { IconClock, IconCheck, IconX, IconAlertCircle, IconTrendingUp } from "@tabler/icons-react";
import { API_URL } from "../../config";

interface TaskHistory {
    id: number;
    client_id: string;
    user_email: string;
    method: string;
    params: number[];
    total_tasks: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    worker_ids: string[];
    created_at: number;
    started_at: number | null;
    completed_at: number | null;
    duration: number | null;
    result: any;
    error: string | null;
}

interface UserStats {
    totalSubmissions: number;
    completedTasks: number;
    failedTasks: number;
    pendingTasks: number;
    runningTasks: number;
    totalComputations: number;
    avgTaskDuration: number;
    tasksPerMethod: Array<{ method: string; count: number }>;
}

const TASKS_PER_PAGE = 10;

export function ClientAcc() {
    const [tasks, setTasks] = useState<TaskHistory[]>([]);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            const userEmail = localStorage.getItem('userEmail');
            
            if (!userEmail) {
                setError("Musisz być zalogowany");
                setLoading(false);
                return;
            }

            try {
                // Pobierz historię zadań (z paginacją)
                const offset = (currentPage - 1) * TASKS_PER_PAGE;
                const historyResponse = await fetch(
                    `${API_URL}/api/monitoring/user/${encodeURIComponent(userEmail)}/history?limit=${TASKS_PER_PAGE}&offset=${offset}`
                );
                
                if (!historyResponse.ok) {
                    throw new Error('Nie udało się pobrać historii');
                }

                const historyData = await historyResponse.json();
                setTasks(historyData.tasks || []);
                setTotalPages(historyData.pagination?.totalPages || 1);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Nieznany błąd');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentPage]);

    // Pobierz statystyki użytkownika (tylko raz przy montowaniu)
    useEffect(() => {
        const fetchStats = async () => {
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) return;

            try {
                const statsResponse = await fetch(
                    `${API_URL}/api/monitoring/user/${encodeURIComponent(userEmail)}/stats`
                );
                
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    setUserStats(statsData);
                }
            } catch (err) {
                console.error('Błąd pobierania statystyk:', err);
            }
        };

        fetchStats();
    }, []);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('pl-PL', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds || seconds <= 0) return '-';
        
        const s = Math.floor(seconds);
        if (s < 60) return `${s}s`;
        
        const minutes = Math.floor(s / 60);
        const secs = s % 60;
        
        if (minutes < 60) {
            return `${minutes}m ${secs}s`;
        }
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m ${secs}s`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'green';
            case 'failed': return 'red';
            case 'running': return 'blue';
            default: return 'gray';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <IconCheck size={20} />;
            case 'failed': return <IconX size={20} />;
            case 'running': return <IconClock size={20} />;
            default: return <IconAlertCircle size={20} />;
        }
    };

    if (loading) {
        return (
            <Container size="lg" py="xl">
                <Center h={400}>
                    <Loader size="xl" color="violet" />
                </Center>
            </Container>
        );
    }

    if (error) {
        return (
            <Container size="lg" py="xl">
                <Alert icon={<IconAlertCircle />} color="red" title="Błąd">
                    {error}
                </Alert>
            </Container>
        );
    }

    const completionRate = userStats 
        ? Math.round((userStats.completedTasks / Math.max(1, userStats.totalSubmissions)) * 100)
        : 0;

    return (
        <Container size="lg" py="xl" className="fade-in">
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
                Historia zadań
            </Title>

            {/* Statystyki */}
            <Paper
                p="xl"
                radius="xl"
                mb="xl"
                style={{
                    background: 'rgba(26, 27, 30, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                {!userStats ? (
                    <Center h={150}>
                        <Loader size="lg" color="violet" />
                    </Center>
                ) : (
                    <Group justify="space-around">
                        <Box ta="center">
                            <RingProgress
                                size={120}
                                thickness={12}
                                sections={[
                                    { value: (userStats.completedTasks / Math.max(1, userStats.totalSubmissions)) * 100, color: 'green' },
                                ]}
                                label={
                                    <Center>
                                        <IconCheck size={32} color="#51cf66" />
                                    </Center>
                                }
                            />
                            <Text size="lg" fw={700} c="white" mt="sm">
                                {userStats.completedTasks}
                            </Text>
                            <Text size="sm" c="dimmed">
                                Ukończone
                            </Text>
                        </Box>

                        <Box ta="center">
                            <RingProgress
                                size={120}
                                thickness={12}
                                sections={[
                                    { value: (userStats.failedTasks / Math.max(1, userStats.totalSubmissions)) * 100, color: 'red' },
                                ]}
                                label={
                                    <Center>
                                        <IconX size={32} color="#ff6b6b" />
                                    </Center>
                                }
                            />
                            <Text size="lg" fw={700} c="white" mt="sm">
                                {userStats.failedTasks}
                            </Text>
                            <Text size="sm" c="dimmed">
                                Nieudane
                            </Text>
                        </Box>

                        <Box ta="center">
                            <IconTrendingUp size={48} color="#7950f2" />
                            <Text size="lg" fw={700} c="white" mt="sm">
                                {userStats.totalComputations.toLocaleString()}
                            </Text>
                            <Text size="sm" c="dimmed">
                                Łącznie obliczeń
                            </Text>
                        </Box>

                        <Box ta="center">
                            <IconClock size={48} color="#7950f2" />
                            <Text size="lg" fw={700} c="white" mt="sm">
                                {formatDuration(userStats.avgTaskDuration)}
                            </Text>
                            <Text size="sm" c="dimmed">
                                Śr. czas
                            </Text>
                        </Box>
                    </Group>
                )}
            </Paper>

            {/* Lista zadań */}
            <Stack gap="md">
                {tasks.length === 0 ? (
                    <Paper
                        p="xl"
                        radius="xl"
                        style={{
                            background: 'rgba(26, 27, 30, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <Text ta="center" c="dimmed" size="lg">
                            Nie masz jeszcze żadnych zadań
                        </Text>
                    </Paper>
                ) : (
                    <>
                        <Timeline active={tasks.length} bulletSize={24} lineWidth={2} color="violet">
                            {tasks.map((task) => (
                            <Timeline.Item
                                key={task.id}
                                bullet={getStatusIcon(task.status)}
                                title={
                                    <Card
                                        p="lg"
                                        radius="lg"
                                        style={{
                                            background: 'rgba(26, 27, 30, 0.6)',
                                            backdropFilter: 'blur(20px)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#7950f2';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <Group justify="space-between" mb="sm">
                                            <Group>
                                                <Badge
                                                    size="lg"
                                                    variant="light"
                                                    color={getStatusColor(task.status)}
                                                >
                                                    {task.status}
                                                </Badge>
                                                <Badge size="lg" variant="light" color="violet">
                                                    {task.method}
                                                </Badge>
                                            </Group>
                                            <Text size="sm" c="dimmed">
                                                {formatDate(task.created_at)}
                                            </Text>
                                        </Group>

                                        <Group justify="space-between" mb="xs">
                                            <Text c="white" fw={500}>
                                                Zadania: {task.total_tasks.toLocaleString()}
                                            </Text>
                                            <Text c="white" fw={500}>
                                                Workerów: {task.worker_ids.length}
                                            </Text>
                                            <Text c="white" fw={500}>
                                                Czas: {formatDuration(task.duration)}
                                            </Text>
                                        </Group>

                                        {task.error && (
                                            <Alert icon={<IconX size={16} />} color="red" mt="sm">
                                                {task.error}
                                            </Alert>
                                        )}

                                        {task.status === 'completed' && task.result !== null && (
                                            <Box
                                                mt="sm"
                                                p="sm"
                                                style={{
                                                    background: 'rgba(0, 0, 0, 0.3)',
                                                    borderRadius: '8px',
                                                    maxHeight: '100px',
                                                    overflow: 'auto',
                                                }}
                                            >
                                                <Text size="xs" c="dimmed" mb={4}>
                                                    Wynik:
                                                </Text>
                                                <Text size="sm" c="white" ff="monospace">
                                                    {typeof task.result === 'object' 
                                                        ? JSON.stringify(task.result, null, 2) 
                                                        : String(task.result)}
                                                </Text>
                                            </Box>
                                        )}
                                    </Card>
                                }
                            />
                        ))}
                    </Timeline>
                    
                    {totalPages > 1 && (
                        <Center mt="xl">
                            <Pagination 
                                total={totalPages} 
                                value={currentPage} 
                                onChange={setCurrentPage}
                                color="violet"
                                size="lg"
                            />
                        </Center>
                    )}
                </>
                )}
            </Stack>
        </Container>
    );
}