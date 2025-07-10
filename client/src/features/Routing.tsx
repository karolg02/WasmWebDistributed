import { RouteObject, useRoutes } from "react-router-dom";
import { TasksPanel } from "./taskspanel/TasksPanel";
import { Layout } from "../layout/Layout";
import { MainPage } from "./mainpage/MainPage";
import { ClientAcc } from "./clientacc/ClientAcc";
import { Help } from "./help/Help";

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
            },
            {
                path: "/help",
                element: <Help />
            }
        ]
    }
]

export const Routing = () => {
    return useRoutes(routes);
}