import { createContext, useContext, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';

const getServerHost = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname;
    }
    return 'localhost';
};

const socket = io(`http://${getServerHost()}:8080/client`);

const SocketContext = createContext<Socket | null>(null);

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocketContext = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocketContext must be used within a SocketProvider');
    }
    return context;
};