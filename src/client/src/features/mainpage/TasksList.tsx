import { Card, Group, Badge, Button, Image, Text, Grid, SimpleGrid } from "@mantine/core";
import { useNavigate } from "react-router-dom";

export function Cards() {
    const navigate = useNavigate();
    const tablica = [
        { id: 1, name: "Calkowanie sin(x)", description: "Description for Card 1", dest: "/client" },
        { id: 2, name: "Card 2", description: "Description for Card 2", dest: "/brak" },
    ];
    return (
        <div>
            <SimpleGrid cols={2} spacing="sm">
                {tablica.map((item) => (

                    <Card shadow="sm" padding="lg" radius="md" withBorder key={item.id}>
                        <Card.Section>
                            <Image
                                src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png"
                                height={160}
                                alt="Norway"
                            />
                        </Card.Section>

                        <Group justify="space-between" mt="md" mb="xs">
                            <Text fw={400}>{item.name}</Text>
                            <Badge color="pink">On Sale</Badge>
                        </Group>

                        <Text size="sm" c="dimmed">
                            {item.description}
                        </Text>

                        <Button color="blue" fullWidth mt="md" radius="md" onClick={() => {navigate(item.dest? item.dest : "/client")}}>
                            Wybierz
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>
        </div>
    );
}