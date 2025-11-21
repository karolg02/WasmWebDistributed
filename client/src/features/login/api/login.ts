import { API_URL } from "../../../config";

interface LoginResponse {
    token: string;
    email: string;
    username: string;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => 'Login failed');
        throw new Error(errText || 'Login failed');
    }

    const data = await response.json().catch(() => null);
    if (!data?.token || !data?.email) throw new Error('Invalid response from server');
    
    return {
        token: data.token,
        email: data.email,
        username: data.username
    };
}