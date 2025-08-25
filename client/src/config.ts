const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const defaultPort = '8080';

export const API_URL = (() => {
  const env = (process.env as any).VITE_API_URL || (process.env as any).REACT_APP_API_URL;
  if (env) return env;
  return `http://${host}:${defaultPort}`;
})();

export const SOCKET_URL = (() => {
  const env = (process.env as any).VITE_SOCKET_URL || (process.env as any).REACT_APP_SOCKET_URL;
  if (env) return env;
  return `http://${host}:${defaultPort}`;
})();