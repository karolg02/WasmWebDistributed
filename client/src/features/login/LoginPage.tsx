import {FC} from 'react';
import {useForm} from "@mantine/form";
import {Button, Paper, Stack, TextInput, Text, Container, Center} from "@mantine/core";
import {login as loginApi} from "./api/login";
import {useNavigate} from "react-router-dom";
import {showNotification} from "@mantine/notifications";

type LoginFormType = {
    email: string,
    password: string,
}

export const LoginPage: FC = () => {
    const navigate = useNavigate();
    const form = useForm<LoginFormType>({ initialValues: { email: '', password: '' }});

    const handleSubmit = async (data: LoginFormType) => {
        try {
            const loginData = await loginApi(data.email, data.password);
            localStorage.setItem('token', loginData.token);
            localStorage.setItem('userEmail', loginData.email);
            localStorage.setItem('username', loginData.username);
            window.dispatchEvent(new Event('auth'));

            showNotification({ color: 'green', title: 'Zalogowano', message: 'Witaj!'});
            navigate('/home', { replace: true });
        } catch (error) {
            console.error("Error during login:", error);
            showNotification({ color: 'red', title: 'Błąd logowania', message: String(error || 'Wystąpił błąd') });
        }
    };

    const handleRegister = () => navigate('/register');

    return (
        <div style={{ backgroundColor: 'rgb(27,27,27)'}}>
            <Container size="xs">
                <Center style={{ minHeight: '100vh'}}>
                    <Paper
                        shadow="xl"
                        radius="md"
                        p="xl"
                        withBorder
                        style={{
                            background: 'rgba(26, 27, 30, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <form onSubmit={form.onSubmit(values => handleSubmit(values))}>
                             <Stack style={{minWidth: "20vW"}}>
                                <Text
                                    size="xl"
                                    fw={900}
                                    variant="gradient"
                                    gradient={{ from: '#7950f2', to: '#9775fa', deg: 45 }}
                                    mb="sm"
                                    style={{ textAlign: 'center' }}
                                >
                                    Witaj w panelu logowania
                                </Text>
                                <TextInput required label="Email" placeholder="Enter your email" {...form.getInputProps('email')} />
                                <TextInput required type='password' label="Password" placeholder="Enter your password" {...form.getInputProps('password')} />
                                <Button variant="gradient" gradient={{ from: '#7950f2', to: '#9775fa', deg: 45 }} type="submit" fullWidth>Zaloguj się</Button>
                                 <Stack align="center">
                                     <Text>Nie masz konta?</Text>
                                     <Text>Kliknij przycisk poniżej!</Text>
                                 </Stack>
                                <Button variant="gradient" gradient={{ from: '#7950f2', to: '#9775fa', deg: 45 }} onClick={() => handleRegister()} fullWidth>Zarejestruj się</Button>
                             </Stack>
                         </form>
                     </Paper>
                 </Center>
             </Container>
         </div>
     );
}