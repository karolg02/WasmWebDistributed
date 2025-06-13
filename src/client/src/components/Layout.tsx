import {
    AppShell,
    Burger,
    Group,
    Text,
    useMantineTheme,
    NavLink,
    Stack,
    Box,
    Divider,
    Avatar,
    UnstyledButton,
    rem
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    IconHome,
    IconDoorExit,
    IconUser,
    IconCpu,
    IconSparkles
} from "@tabler/icons-react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export const Layout = () => {
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useMantineTheme();

    return (
        <AppShell
            header={{ height: 70 }}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
            }}
            padding="md"
            style={{
                background: 'transparent',
            }}
        >
            <AppShell.Header
                style={{
                    background: 'rgba(26, 27, 30, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
                }}
            >
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger
                            opened={mobileOpened}
                            onClick={toggleMobile}
                            hiddenFrom="sm"
                            size="sm"
                            color={theme.colors.gray[5]}
                        />
                        <Burger
                            opened={desktopOpened}
                            onClick={toggleDesktop}
                            visibleFrom="sm"
                            size="sm"
                            color={theme.colors.gray[5]}
                        />
                        <Group gap="sm">
                            <Box
                                style={{
                                    background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                                    borderRadius: '50%',
                                    padding: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <IconCpu size={24} color="white" />
                            </Box>
                            <Text fw={700} size="lg"
                                style={{
                                    background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Web Distributed Computing
                            </Text>
                        </Group>
                    </Group>

                    <UnstyledButton
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                    >
                        <Group gap="sm">
                            <Avatar size={32} radius="xl"
                                style={{
                                    background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                                }}
                            >
                                <IconUser size={16} />
                            </Avatar>
                            <Text size="sm" fw={500} c="white">Użytkownik</Text>
                        </Group>
                    </UnstyledButton>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar
                p="md"
                style={{
                    background: 'rgba(26, 27, 30, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <Stack gap="xs" className="fade-in">
                    <Box mb="md">
                        <Text size="xs" fw={600} c="dimmed" mb="md" tt="uppercase" lts={rem(1)}>Menu Główne</Text>

                        <Stack gap="xs">
                            <NavLink
                                label="Strona główna"
                                leftSection={<IconHome size={18} />}
                                active={location.pathname === '/'}
                                onClick={() => navigate('/')}
                                style={{
                                    borderRadius: '12px',
                                    background: location.pathname === '/' ?
                                        'linear-gradient(45deg, rgba(121, 80, 242, 0.2), rgba(151, 117, 250, 0.2))' :
                                        'transparent',
                                    border: location.pathname === '/' ?
                                        '1px solid rgba(121, 80, 242, 0.3)' :
                                        '1px solid transparent',
                                    backdropFilter: location.pathname === '/' ? 'blur(10px)' : 'none',
                                }}
                            />

                            <NavLink
                                label="Panel Zadań"
                                leftSection={<IconSparkles size={18} />}
                                active={location.pathname === '/client'}
                                onClick={() => navigate('/client')}
                                style={{
                                    borderRadius: '12px',
                                    background: location.pathname === '/client' ?
                                        'linear-gradient(45deg, rgba(121, 80, 242, 0.2), rgba(151, 117, 250, 0.2))' :
                                        'transparent',
                                    border: location.pathname === '/client' ?
                                        '1px solid rgba(121, 80, 242, 0.3)' :
                                        '1px solid transparent',
                                    backdropFilter: location.pathname === '/client' ? 'blur(10px)' : 'none',
                                }}
                            />

                            <NavLink
                                label="Profil"
                                leftSection={<IconUser size={18} />}
                                active={location.pathname === '/clientacc'}
                                onClick={() => navigate('/clientacc')}
                                style={{
                                    borderRadius: '12px',
                                    background: location.pathname === '/clientacc' ?
                                        'linear-gradient(45deg, rgba(121, 80, 242, 0.2), rgba(151, 117, 250, 0.2))' :
                                        'transparent',
                                    border: location.pathname === '/clientacc' ?
                                        '1px solid rgba(121, 80, 242, 0.3)' :
                                        '1px solid transparent',
                                    backdropFilter: location.pathname === '/clientacc' ? 'blur(10px)' : 'none',
                                }}
                            />
                        </Stack>
                    </Box>

                    <Divider my="sm" color="rgba(255, 255, 255, 0.1)" />

                    <Text size="xs" fw={600} c="dimmed" mb="xs" tt="uppercase" lts={rem(1)}>Historia</Text>

                    <Box
                        mb="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '20px',
                            textAlign: 'center'
                        }}
                    >
                        <Text c="dimmed" size="sm">Brak historii zadań</Text>
                    </Box>

                    <Box style={{ marginTop: 'auto' }}>
                        <Divider my="sm" color="rgba(255, 255, 255, 0.1)" />
                        <NavLink
                            label="Wyloguj"
                            leftSection={<IconDoorExit size={18} />}
                            onClick={() => navigate('/logout')}
                            style={{
                                borderRadius: '12px',
                                color: '#ff6b6b',
                                '&:hover': {
                                    background: 'rgba(255, 107, 107, 0.1)',
                                }
                            }}
                        />
                        <Group justify="center" my="md">
                            <Text size="xs" c="dimmed">© 2025 Web Distributed Computing</Text>
                        </Group>
                    </Box>
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main>
                <div className="fade-in">
                    <Outlet />
                </div>
            </AppShell.Main>
        </AppShell>
    );
}
