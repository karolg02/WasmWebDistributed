import { AppShell, Avatar, Burger, Button, Center, Group, Loader, Popover, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHome, IconDoorExit } from "@tabler/icons-react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

export const Layout = () => {
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
    const navigate = useNavigate();
    const [show1, setShow1] = useState(false);
    const [show2, setShow2] = useState(false);
    const [show3, setShow3] = useState(false);
    const [show4, setShow4] = useState(false);

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
                    <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
                    <Text><b>Web Distributed Computing System</b></Text>
                    <Group justify="end" style={{ flex: "1" }}>
                        <Group ml="xs" gap={4} style={{ alignItems: "end" }}>
                            <Popover radius="xl" position="bottom" withArrow shadow="md" opened={show1}>
                                <Popover.Target>
                                    <Button
                                        onMouseEnter={() => setShow1(true)}
                                        onMouseLeave={() => setShow1(false)}
                                        className="buttonCover" variant="transparent" onClick={() => navigate('/')}>
                                        <IconHome color="black" />
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown style={{ pointerEvents: 'none' }}>
                                    <Text size="sm">Strona główna</Text>
                                </Popover.Dropdown>
                            </Popover>

                            <Popover radius="lg" position="bottom" shadow="md" withArrow opened={show2}>
                                <Popover.Target>
                                    <Button
                                        onMouseEnter={() => setShow2(true)}
                                        onMouseLeave={() => setShow2(false)}
                                        className="buttonCover" variant="transparent" onClick={() => navigate('/clientacc')}>
                                        <Avatar variant="transparent" color="black" radius="xl" style={{ marginLeft: 2 }} />
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <Text size="sm">Profil</Text>
                                </Popover.Dropdown>
                            </Popover>

                            <Popover radius="xl" position="bottom" withArrow shadow="md" opened={show3}>
                                <Popover.Target>
                                    <Button
                                        onMouseEnter={() => setShow3(true)}
                                        onMouseLeave={() => setShow3(false)}
                                        className="buttonCover" variant="transparent" >
                                        <IconDoorExit style={{ marginLeft: 4, color: "black" }} />
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <Text size="sm">Wyloguj</Text>
                                </Popover.Dropdown>
                            </Popover>
                        </Group>
                    </Group>
                </Group>
            </AppShell.Header>
            <AppShell.Navbar p="md">
                <Center><Loader size="md" type="dots" /></Center>
                <Text fw={500} mb="md">Wstepnie tu beda najnowsze zadania zrobione poprzez przegladarki</Text>
            </AppShell.Navbar>
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}
