import {
    AppShell,
    Group,
    Text,
    Box,
    Avatar,
    UnstyledButton,
    Menu,
    ActionIcon
} from "@mantine/core";
import {
    IconHome,
    IconDoorExit,
    IconUser,
    IconCpu,
    IconQuestionMark,
    IconChevronDown
} from "@tabler/icons-react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <AppShell
            header={{ height: 70 }}
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
                    {/* Logo i nazwa po lewej */}
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

                    {/* Przyciski nawigacji po prawej */}
                    <Group gap="sm">
                        <UnstyledButton
                            onClick={() => navigate('/')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                background: location.pathname === '/' ?
                                    'linear-gradient(45deg, rgba(121, 80, 242, 0.3), rgba(151, 117, 250, 0.3))' :
                                    'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                                border: location.pathname === '/' ?
                                    '1px solid rgba(121, 80, 242, 0.5)' :
                                    '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    background: location.pathname === '/' ?
                                        'linear-gradient(45deg, rgba(121, 80, 242, 0.4), rgba(151, 117, 250, 0.4))' :
                                        'rgba(255, 255, 255, 0.15)',
                                }
                            }}
                        >
                            <Group gap="xs">
                                <IconHome size={16} color={location.pathname === '/' ? '#7950f2' : 'white'} />
                                <Text size="sm" fw={500} c={location.pathname === '/' ? '#7950f2' : 'white'}>
                                    Strona główna
                                </Text>
                            </Group>
                        </UnstyledButton>

                        <UnstyledButton
                            onClick={() => navigate('/clientacc')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                background: location.pathname === '/clientacc' ?
                                    'linear-gradient(45deg, rgba(121, 80, 242, 0.3), rgba(151, 117, 250, 0.3))' :
                                    'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                                border: location.pathname === '/clientacc' ?
                                    '1px solid rgba(121, 80, 242, 0.5)' :
                                    '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    background: location.pathname === '/clientacc' ?
                                        'linear-gradient(45deg, rgba(121, 80, 242, 0.4), rgba(151, 117, 250, 0.4))' :
                                        'rgba(255, 255, 255, 0.15)',
                                }
                            }}
                        >
                            <Group gap="xs">
                                <Avatar size={14} radius="xl"

                                >
                                    <IconUser size={16} />
                                </Avatar>
                                <Text size="sm" fw={500} c={location.pathname === '/clientacc' ? '#7950f2' : 'white'}>
                                    Profil klienta
                                </Text>
                            </Group>
                        </UnstyledButton>

                        <UnstyledButton
                            onClick={() => navigate('/help')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                background: location.pathname === '/help' ?
                                    'linear-gradient(45deg, rgba(121, 80, 242, 0.3), rgba(151, 117, 250, 0.3))' :
                                    'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                                border: location.pathname === '/help' ?
                                    '1px solid rgba(121, 80, 242, 0.5)' :
                                    '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    background: location.pathname === '/help' ?
                                        'linear-gradient(45deg, rgba(121, 80, 242, 0.4), rgba(151, 117, 250, 0.4))' :
                                        'rgba(255, 255, 255, 0.15)',
                                }
                            }}
                        >
                            <Group gap="xs">
                                <IconQuestionMark size={16} color={location.pathname === '/help' ? '#7950f2' : 'white'} />
                                <Text size="sm" fw={500} c={location.pathname === '/help' ? '#7950f2' : 'white'}>
                                    Pomoc
                                </Text>
                            </Group>
                        </UnstyledButton>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Main>
                <div className="fade-in">
                    <Outlet />
                </div>
            </AppShell.Main>
        </AppShell>
    );
}