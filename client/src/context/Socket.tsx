import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const getServerHost = () => {
  if (typeof window !== 'undefined') return window.location.hostname;
  return 'localhost';
};

const SocketContext = createContext<Socket | null>(null);

interface SocketProviderProps { children: ReactNode; }

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const connect = () => {
    const token = localStorage.getItem('token') || undefined;
    const s = io(`http://${getServerHost()}:8080/client`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = s;
    setSocket(s);
    return s;
  };

  useEffect(() => {
    const s = connect();

    const onAuth = () => {
      try { socketRef.current?.disconnect(); } catch (e) {}
      connect();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') onAuth();
    };

    window.addEventListener('auth', onAuth);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('auth', onAuth);
      window.removeEventListener('storage', onStorage);
      socketRef.current?.close();
      setSocket(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = (): Socket | null => {
  return useContext(SocketContext);
};