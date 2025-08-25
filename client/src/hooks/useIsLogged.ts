import { useEffect, useState } from "react";

export const useIsLogged = (): boolean => {
  const [isLogged, setIsLogged] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') setIsLogged(!!e.newValue);
    };
    const onAuth = () => setIsLogged(!!localStorage.getItem('token'));

    window.addEventListener('storage', onStorage);
    window.addEventListener('auth', onAuth as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth', onAuth as EventListener);
    };
  }, []);

  return isLogged;
};