import { RouteObject, useRoutes } from "react-router-dom";
import { ClientPanel } from "./taskspanel/TasksPanel";
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
                element: <ClientPanel />
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