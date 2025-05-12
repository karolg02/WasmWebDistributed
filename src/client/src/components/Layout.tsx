import { AppShell, Avatar, Burger, Button, Group, Popover, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHome, IconPencilPlus, IconWallpaper, IconShoppingBag, IconDoorExit } from "@tabler/icons-react";
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
                    <Text>Web Distributed Computing System</Text>
                    <Group justify="end" style={{ flex: "1" }}>
                        <Group ml="xs" gap={4} style={{ alignItems: "end" }}>
                            <Popover radius="xl" position="bottom" withArrow shadow="md" opened={show1}>
                                <Popover.Target>
                                    <Button
                                        onMouseEnter={() => setShow1(true)}
                                        onMouseLeave={() => setShow1(false)}
                                        className="buttonCover" variant="transparent" onClick={() => navigate('/')}>
                                        <IconHome />
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown style={{ pointerEvents: 'none' }}>
                                    <Text size="sm">Strona główna</Text>
                                </Popover.Dropdown>
                            </Popover>

                            <Popover radius="xl" position="bottom" withArrow shadow="md" opened={show2}>
                                <Popover.Target>
                                    <Button
                                        onMouseEnter={() => setShow2(true)}
                                        onMouseLeave={() => setShow2(false)}
                                        className="buttonCover" variant="transparent" onClick={() => navigate('/offers/new')}>
                                        <IconPencilPlus />
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown style={{ pointerEvents: 'none' }}>
                                    <Text size="sm">Dodaj oferte</Text>
                                </Popover.Dropdown>
                            </Popover>

                            <Popover radius="xl" position="bottom" withArrow shadow="md" opened={show3}>
                                <Popover.Target>
                                    <Button
                                        onMouseEnter={() => setShow3(true)}
                                        onMouseLeave={() => setShow3(false)}
                                        className="buttonCover" variant="transparent" onClick={() => navigate('/myoffers')}>
                                        <IconWallpaper />
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown style={{ pointerEvents: 'none' }}>
                                    <Text size="sm">Moje oferty</Text>
                                </Popover.Dropdown>
                            </Popover>

                            <Popover radius="xl" position="bottom" withArrow shadow="md" opened={show4}>
                                <Popover.Target>
                                    <Button
                                        onMouseEnter={() => setShow4(true)}
                                        onMouseLeave={() => setShow4(false)}
                                        className="buttonCover" variant="transparent" onClick={() => navigate('/mycart')}>
                                        <IconShoppingBag />
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown style={{ pointerEvents: 'none' }}>
                                    <Text size="sm">Koszyk</Text>
                                </Popover.Dropdown>
                            </Popover>


                            <Popover radius="lg" position="bottom" shadow="md" withArrow>
                                <Popover.Target>
                                    <Button className="buttonCover" variant="transparent">
                                        <Avatar variant="transparent" color="black" radius="xl" style={{ marginLeft: 2 }} />
                                    </Button>
                                </Popover.Target>
                                <Popover.Dropdown bg="dark">
                                    <Button className="buttonCover" variant="transparent" >
                                        Mój profil <i className="pi pi-user" style={{ fontSize: '2.5rem' }}></i>
                                    </Button>
                                    <Button className="buttonCover" variant="transparent" >
                                        Wyloguj <IconDoorExit style={{ marginLeft: 4, color: "orange" }} />
                                    </Button>
                                </Popover.Dropdown>
                            </Popover>
                        </Group>
                    </Group>
                </Group>
            </AppShell.Header>
            <AppShell.Navbar p="md">
                <Text fw={500} mb="md">Panel nawigacyjny</Text>

            </AppShell.Navbar>
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}
