import { createHashRouter, Navigate } from "react-router-dom";

import { AuthPage } from "@/features/auth/AuthPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { ChatView } from "@/features/chat/ChatView";
import { FriendsView } from "@/features/friends/FriendsView";
import { ServerRedirect } from "@/features/servers/ServerRedirect";
import { AppShell } from "@/features/shell/AppShell";
import { RouteError } from "@/features/shell/RouteError";
import { useParams } from "react-router-dom";

function ChatRoute() {
  const { channelId } = useParams<{ channelId: string }>();
  if (!channelId) return <Navigate to="/" replace />;
  return <ChatView channelId={channelId} />;
}

export const router = createHashRouter([
  { path: "/auth", element: <AuthPage />, errorElement: <RouteError /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <FriendsView /> },
      { path: "dm/:channelId", element: <ChatRoute /> },
      { path: "s/:serverId", element: <ServerRedirect /> },
      { path: "s/:serverId/:channelId", element: <ChatRoute /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
