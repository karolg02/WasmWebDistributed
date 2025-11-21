import { Navigate, RouteObject, useRoutes } from "react-router-dom";
import { TasksPanel } from "./taskspanel/TasksPanel";
import { Layout } from "../layout/Layout";
import { MainPage } from "./mainpage/MainPage";
import { ClientAcc } from "./clientacc/ClientAcc";
import { Help } from "./help/Help";
import { Stats } from "./stats/Stats";
import { useIsLogged } from "../hooks/useIsLogged";
import { LoginPage } from "./login/LoginPage";
import { RegisterPage } from "./register/RegisterPage";

export const Routing = () => {
  const isLogged = useIsLogged();
  console.log('Routing isLogged=', isLogged, 'token=', localStorage.getItem('token'));

  const routes: RouteObject[] = [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },

    {
      path: '/',
      element: isLogged ? <Layout /> : <Navigate to="/login" replace />,
      children: [
        { path: '/home', element: <MainPage /> },
        { path: 'client', element: <TasksPanel /> },
        { path: 'clientacc', element: <ClientAcc /> },
        { path: 'stats', element: <Stats /> },
        { path: 'help', element: <Help /> },
      ],
    },

    { path: '*', element: isLogged ? <Navigate to="/" replace /> : <Navigate to="/login" replace /> },
  ];

  return useRoutes(routes);
};