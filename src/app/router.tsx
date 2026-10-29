import { lazy, Suspense, type ReactNode } from "react";
import { createHashRouter, Navigate, useParams } from "react-router-dom";

import { RequireAuth } from "@/features/auth/RequireAuth";
import { RouteError } from "@/features/shell/RouteError";
import { useChannel } from "@/features/dm/use-dms";

// Every top-level screen is split so the auth page never pays for the shell, the
// chat view or the voice stack.
const AuthPage = lazy(() =>
  import("@/features/auth/AuthPage").then((module) => ({ default: module.AuthPage })),
);
const AppShell = lazy(() =>
  import("@/features/shell/AppShell").then((module) => ({ default: module.AppShell })),
);
const FriendsView = lazy(() =>
  import("@/features/friends/FriendsView").then((module) => ({ default: module.FriendsView })),
);
const ChatView = lazy(() =>
  import("@/features/chat/ChatView").then((module) => ({ default: module.ChatView })),
);
const VoiceRoom = lazy(() =>
  import("@/features/voice/VoiceRoom").then((module) => ({ default: module.VoiceRoom })),
);
const ServerRedirect = lazy(() =>
  import("@/features/servers/ServerRedirect").then((module) => ({
    default: module.ServerRedirect,
  })),
);

function Screen({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[120px] flex-1 items-center justify-center text-[13px] text-muted-foreground">
          …
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

function ChatRoute() {
  const { channelId } = useParams<{ channelId: string }>();
  if (!channelId) return <Navigate to="/" replace />;
  return <ChannelRoute channelId={channelId} />;
}

function ChannelRoute({ channelId }: { channelId: string }) {
  const { data: channel, isLoading } = useChannel(channelId);

  if (!isLoading && channel?.type === "voice") {
    return (
      <Screen>
        <VoiceRoom channelId={channelId} channelName={channel.name ?? ""} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ChatView channelId={channelId} />
    </Screen>
  );
}

export const router = createHashRouter([
  {
    path: "/auth",
    element: (
      <Screen>
        <AuthPage />
      </Screen>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Screen>
          <AppShell />
        </Screen>
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <Screen>
            <FriendsView />
          </Screen>
        ),
      },
      { path: "dm/:channelId", element: <ChatRoute /> },
      {
        path: "s/:serverId",
        element: (
          <Screen>
            <ServerRedirect />
          </Screen>
        ),
      },
      { path: "s/:serverId/:channelId", element: <ChatRoute /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
