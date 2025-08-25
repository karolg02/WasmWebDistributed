import { API_URL } from "../../../config";

export const login = async (username: string, password: string): Promise<string> => {
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
    const token = data?.token || data?.accessToken || null;
    if (!token) throw new Error('No token in response');
    return token as string;
}