import { API_URL } from "../../../config";
import { showNotification } from "@mantine/notifications";

export const Register = async (name: string, surename: string, email: string, password: string, number: number) => {
    const payload = {
        username: email,
        email,
        password,
        name,
        surename,
        phone: number
    };

    const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers : {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
    });

    if (response.ok) {
        const data = await response.json();

        const token = data.token || data?.accessToken || null;
        if (!token) {
            showNotification({ color: "red", title: "Błąd", message: "Brak tokena w odpowiedzi", autoClose: 4000 });
            throw new Error("No token returned");
        }
        return token as string;
    } else {
        let errorMessage = "Nie udało się utworzyć użytkownika!";

        try {
            const errorData = await response.json();
            if (errorData && (errorData.error || errorData.message)) {
                errorMessage = (errorData.error || errorData.message);
            }
        } catch (e) {
            console.error("Nie udało się sparsować odpowiedzi błędu:", e);
        }

        showNotification({
            color: "red",
            title: "Niepowodzenie!",
            message: errorMessage,
            autoClose: 3000,
        });
        throw new Error(errorMessage);
    }
}