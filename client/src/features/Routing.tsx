import { Navigate, RouteObject, useRoutes, useLocation, useNavigate } from "react-router-dom";
import { TasksPanel } from "./taskspanel/TasksPanel";
import { Layout } from "../layout/Layout";
import { MainPage } from "./mainpage/MainPage";
import { ClientAcc } from "./clientacc/ClientAcc";
import { Help } from "./help/Help";
import { Stats } from "./stats/Stats";
import { useIsLogged } from "../hooks/useIsLogged";
import { LoginPage } from "./login/LoginPage";
import { RegisterPage } from "./register/RegisterPage";
import { useEffect } from "react";

export const Routing = () => {
  const isLogged = useIsLogged();
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log('Routing isLogged=', isLogged, 'token=', localStorage.getItem('token'));

  // Przekieruj do /login jeśli nie zalogowany i nie jest już na stronie logowania/rejestracji
  useEffect(() => {
    const protectedPaths = ['/', '/home', '/client', '/clientacc', '/stats', '/help'];
    const currentPath = location.pathname;
    
    if (!isLogged && protectedPaths.includes(currentPath)) {
      console.log('Not logged in, redirecting to /login from', currentPath);
      navigate('/login', { replace: true });
    }
  }, [isLogged, location.pathname, navigate]);

  const routes: RouteObject[] = [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },

    {
      path: '/',
      element: isLogged ? <Layout /> : <Navigate to="/login" replace />,
      children: [
        { path: '/', element: <Navigate to="/home" replace /> },
        { path: '/home', element: <MainPage /> },
        { path: 'client', element: <TasksPanel /> },
        { path: 'clientacc', element: <ClientAcc /> },
        { path: 'stats', element: <Stats /> },
        { path: 'help', element: <Help /> },
      ],
    },

    { path: '*', element: isLogged ? <Navigate to="/home" replace /> : <Navigate to="/login" replace /> },
  ];

  return useRoutes(routes);
};