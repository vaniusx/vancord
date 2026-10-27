import { createHashRouter, Navigate } from "react-router-dom";

import { AuthPage } from "@/features/auth/AuthPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { ChatView } from "@/features/chat/ChatView";
import { useChannel } from "@/features/dm/use-dms";
import { lazy, Suspense } from "react";

const VoiceRoom = lazy(() =>
  import("@/features/voice/VoiceRoom").then((module) => ({ default: module.VoiceRoom })),
);
import { FriendsView } from "@/features/friends/FriendsView";
import { ServerRedirect } from "@/features/servers/ServerRedirect";
import { AppShell } from "@/features/shell/AppShell";
import { RouteError } from "@/features/shell/RouteError";
import { useParams } from "react-router-dom";

function ChatRoute() {
  const { channelId } = useParams<{ channelId: string }>();
  if (!channelId) return <Navigate to="/" replace />;
  return <ChannelRoute channelId={channelId} />;
}

function ChannelRoute({ channelId }: { channelId: string }) {
  const { data: channel, isLoading } = useChannel(channelId);
  if (isLoading) return <ChatView channelId={channelId} />;
  if (channel?.type === "voice") {
    return (
      <Suspense fallback={<div className="flex flex-1 items-center justify-center text-[13px] text-muted-foreground">…</div>}>
        <VoiceRoom channelId={channelId} channelName={channel.name ?? ""} />
      </Suspense>
    );
  }
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
