import { Container, Title, Text, Space } from "@mantine/core";
import { TasksList } from "./TasksList";

export function MainPage() {
    return (
        <Container size="lg" py="xl">
            <Title order={1} mb="sm" c="cyan">Dostępne zadania</Title>
            <Text c="dimmed" mb="xl">Wybierz zadanie, które chcesz wykonać wykorzystując moc obliczeniową przeglądarek</Text>
            <Space h="md" />
            <TasksList />
        </Container>
    );
}