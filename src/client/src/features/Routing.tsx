import { RouteObject, useRoutes } from "react-router-dom";
import { ClientPanel } from "./taskspanel/TasksPanel";
import { Layout } from "../components/Layout";

const routes: RouteObject[] = [
    {
        path: "/",
        element: <Layout />,
        children: [
            {
                path: "/",
                element: <div>Home</div>
            },
            {
                path: "/client",
                element: <ClientPanel />
            }
        ]
    }
]

export const Routing = () => {
    return useRoutes(routes);
}