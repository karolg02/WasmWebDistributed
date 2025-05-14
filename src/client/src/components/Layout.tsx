import {
    AppShell,
    Burger,
    Group,
    Text,
    useMantineTheme,
    NavLink,
    Stack,
    Box,
    Divider
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    IconHome,
    IconDoorExit,
    IconUser
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
            header={{ height: 60 }}
            navbar={{
                width: 280,
                breakpoint: 'sm',
                collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
            }}
            padding="md"
            bg="dark.8"
        >
            <AppShell.Header bg="dark.7" style={{ borderBottom: `1px solid ${theme.colors.dark[5]}` }}>
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
                        <Text fw={700} size="lg" c="cyan">Web Distributed Computing</Text>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md" bg="dark.7">
                <Stack gap="xs">
                    <Box mb="md">
                        <Text size="sm" fw={500} c="dimmed" mb="xs">MENU</Text>

                        <NavLink
                            label="Strona główna"
                            leftSection={<IconHome size={18} />}
                            active={location.pathname === '/'}
                            onClick={() => navigate('/')}
                            color="cyan"
                        />

                        <NavLink
                            label="Profil"
                            leftSection={<IconUser size={18} />}
                            active={location.pathname === '/clientacc'}
                            onClick={() => navigate('/clientacc')}
                            color="cyan"
                        />
                        <NavLink
                            label="Wyloguj"
                            leftSection={<IconDoorExit size={18} />}
                            active={location.pathname === '/logout'}
                            onClick={() => navigate('/logout')}
                            color="cyan"
                        />
                    </Box>
                    <Divider my="sm" />

                    <Text size="sm" fw={500} c="dimmed" mb="xs">OSTATNIE ZADANIA</Text>

                    <Box mb="md">
                        <Text c="dimmed" size="sm" ta="center" py="xl">Brak historii zadań</Text>
                    </Box>

                    <Box style={{ marginTop: 'auto' }}>
                        <Divider my="sm" />
                        <Group justify="center" my="xs">
                            <Text size="xs" c="dimmed">© 2025 Web Distributed Computing</Text>
                        </Group>
                    </Box>
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main style={{ backgroundColor: theme.colors.dark[8] }}>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}
