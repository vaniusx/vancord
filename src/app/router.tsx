import { createHashRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/features/shell/AppShell";
import { ChatArea } from "@/features/shell/ChatArea";
import { RouteError } from "@/features/shell/RouteError";
import { WelcomePane } from "@/features/shell/WelcomePane";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <WelcomePane /> },
      {
        path: "channels/:channelId",
        element: <ChatArea />,
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
