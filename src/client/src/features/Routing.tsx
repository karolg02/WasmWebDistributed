import { RouteObject, useRoutes } from "react-router-dom";
import { TasksPanel } from "./taskspanel/TasksPanel";
import { Layout } from "../components/Layout";
import { MainPage } from "./mainpage/MainPage";
import { ClientAcc } from "./clientacc/ClientAcc";

const routes: RouteObject[] = [
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                path: "/",
                element: <MainPage />
            },
            {
                path: "/client",
                element: <TasksPanel />
            },
            {

                path: "/clientacc",
                element: <ClientAcc />
            }
        ]
    }
]

export const Routing = () => {
    return useRoutes(routes);
}