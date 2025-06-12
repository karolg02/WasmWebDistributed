import { Container, Title, Text, Space } from "@mantine/core";
import { TasksList } from "./TasksList";

export function MainPage() {
    return (
        <Container size="lg" py="xl">
            <TasksList />
        </Container>
    );
}