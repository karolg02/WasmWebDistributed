import {Button, Center, Container, NumberInput, Paper, Stack, Text, TextInput} from "@mantine/core";
import {showNotification} from "@mantine/notifications";
import {useForm} from "@mantine/form";
import {useNavigate} from "react-router-dom";
import {Register} from "./api/register";

type RegisterTypes = {
    name: string,
    surename: string,
    email: string,
    password: string,
    number: number,
}

export const RegisterPage = () => {
    const navigate = useNavigate();
    const form = useForm<RegisterTypes>({
        initialValues: {
            name: '',
            surename: '',
            email: '',
            password: '',
            number: 0,
        },
    });

    const handleLoginButton = () =>{
        navigate('/login');
    }

    const handleSubmit =  async (data: RegisterTypes) =>{
        try{
            const token = await Register(data.name, data.surename, data.email, data.password, data.number);
            if (token) {
                localStorage.setItem('token', token);
                window.dispatchEvent(new Event('auth'));
                showNotification({ color: "green", title: "Sukces!", message: "Rejestracja przebiegła pomyślnie!", autoClose: 3000 });
                navigate('/home', { replace: true });
            }
        } catch (error) {
            console.error("Nie udało się zarejestrować", error);
            showNotification({ color: "red", title: "Niepowodzenie!", message: (error as Error).message || "Błąd rejestracji", autoClose: 4000 });
        }
    }

    return (
        <div
            style={{
                backgroundColor: 'rgb(27,27,27)'
            }}
        >
            <Container
                size="xs"
            >
                <Center style={{minHeight: '100vh'}}>
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
                        <Text
                            size="xl"
                            fw={900}
                            variant="gradient"
                            gradient={{ from: '#7950f2', to: '#9775fa', deg: 45 }}
                            mb="lg"
                            style={{ textAlign: 'center' }}
                        >
                            Witaj w panelu rejestracji!
                        </Text>
                        <form onSubmit={form.onSubmit(values => handleSubmit(values))}>
                            <Stack style={{minWidth: "20vW"}}>
                                <TextInput
                                    required
                                    label="Imię"
                                    placeholder="Imię"
                                    {...form.getInputProps('name')}
                                />
                                <TextInput
                                    required
                                    label="Nazwisko"
                                    placeholder="Nazwisko"
                                    {...form.getInputProps('surename')}
                                />
                                <TextInput
                                    required
                                    label="Email"
                                    placeholder="Adres email"
                                    {...form.getInputProps('email')}
                                />
                                <TextInput
                                    required
                                    type='password'
                                    label="Password"
                                    placeholder="Hasło"
                                    {...form.getInputProps('password')}
                                />
                                <NumberInput
                                    hideControls
                                    required
                                    type='tel'
                                    label="Numer telefonu"
                                    placeholder="+48"
                                    {...form.getInputProps('number')}
                                />
                                <Button
                                    variant="gradient"
                                    gradient={{ from: '#7950f2', to: '#9775fa', deg: 45 }}
                                    type="submit"
                                    fullWidth
                                >
                                    Zarejestruj się
                                </Button>
                                <Stack align="center">
                                    <Text>Masz konto?</Text>
                                    <Text>Kliknij przycisk poniżej, aby się zalogować!</Text>
                                </Stack>
                                <Button
                                    variant="gradient"
                                    gradient={{ from: '#7950f2', to: '#9775fa', deg: 45 }}
                                    onClick={() => handleLoginButton()}
                                    fullWidth
                                >
                                    Zaloguj się
                                </Button>
                            </Stack>
                        </form>
                    </Paper>
                </Center>
            </Container>
        </div>
    )
}