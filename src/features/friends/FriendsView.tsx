import {
  AtSign,
  Check,
  MessageSquare,
  Search,
  UserPlus,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/features/app/app-store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Avatar } from "@/components/common/avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useStartDm } from "@/features/dm/use-dms";
import {
  useFriendMutations,
  useFriendships,
  useSearchUsers,
} from "@/features/friends/use-friends";
import { useLiveStatus } from "@/features/realtime/realtime";
import { StatusDot } from "@/features/shell/presence";
import type { FriendEdge, ProfileSummary } from "@/lib/models";
import { cn } from "@/lib/utils";

function PersonRow({
  profile,
  actions,
}: {
  profile: ProfileSummary;
  actions?: React.ReactNode;
}) {
  const status = useLiveStatus(profile.id, profile.status);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-border/70 hover:bg-card/60">
      <div className="relative">
        <Avatar profile={profile} size="md" />
        <StatusDot
          status={status}
          className="absolute -right-0.5 -bottom-0.5 size-2.5"
        />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13.5px] font-semibold">
          {profile.display_name}
        </p>
        <p className="truncate text-[11.5px] text-muted-foreground">
          @{profile.username}
        </p>
      </div>
      <div className="flex items-center gap-1">{actions}</div>
    </div>
  );
}

export function FriendsView() {
  const { t } = useTranslation();
  const setInboxOpen = useAppStore((state) => state.setInboxOpen);
  const setGroupDmOpen = useAppStore((state) => state.setGroupDmOpen);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { data: edges, isLoading } = useFriendships();
  const { sendRequest, respond, remove } = useFriendMutations();
  const startDm = useStartDm();
  const [query, setQuery] = useState("");
  const { data: results, isFetching } = useSearchUsers(query);

  const friends = useMemo(
    () =>
      (edges ?? [])
        .filter((edge) => edge.status === "accepted")
        .map((edge) =>
          edge.requester_id === user?.id ? edge.addressee : edge.requester,
        )
        .filter((profile): profile is ProfileSummary => Boolean(profile)),
    [edges, user?.id],
  );

  const incoming = useMemo(
    () =>
      (edges ?? []).filter(
        (edge) => edge.status === "pending" && edge.addressee_id === user?.id,
      ),
    [edges, user?.id],
  );

  const outgoing = useMemo(
    () =>
      (edges ?? []).filter(
        (edge) => edge.status === "pending" && edge.requester_id === user?.id,
      ),
    [edges, user?.id],
  );

  const blocked = useMemo(
    () => (edges ?? []).filter((edge) => edge.status === "blocked"),
    [edges],
  );

  const existingIds = new Set(
    (edges ?? []).flatMap((edge) => [edge.requester_id, edge.addressee_id]),
  );

  const openDm = async (profileId: string) => {
    const channelId = await startDm.mutateAsync(profileId);
    navigate(`/dm/${channelId}`);
  };

  const add = (profile: ProfileSummary) => {
    sendRequest.mutate(profile.id, {
      onSuccess: () => toast.success(t("friends.requestSent", { name: profile.display_name })),
      onError: () => toast.error(t("common.error")),
    });
  };

  const renderEdge = (edge: FriendEdge, kind: "incoming" | "outgoing" | "blocked") => {
    const profile =
      edge.requester_id === user?.id ? edge.addressee : edge.requester;
    if (!profile) return null;

    return (
      <PersonRow
        key={`${edge.requester_id}-${edge.addressee_id}`}
        profile={profile}
        actions={
          kind === "incoming" ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-status-online"
                aria-label={t("friends.accept")}
                onClick={() =>
                  respond.mutate({ requesterId: edge.requester_id, status: "accepted" })
                }
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground"
                aria-label={t("friends.decline")}
                onClick={() => remove.mutate({ otherId: profile.id })}
              >
                <X className="size-4" />
              </Button>
            </>
          ) : kind === "outgoing" ? (
            <Badge variant="secondary" className="text-[10px]">
              {t("friends.pending")}
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => remove.mutate({ otherId: profile.id })}
            >
              <UserRoundX className="mr-1 size-3.5" />
              {t("friends.unblock")}
            </Button>
          )
        }
      />
    );
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <UserPlus className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[14px] font-semibold">{t("friends.title")}</h1>
          <p className="truncate text-[11px] text-muted-foreground">
            {t("friends.subtitle")}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-[12px] text-muted-foreground"
          onClick={() => setGroupDmOpen(true)}
        >
          <Users className="size-3.5" />
          {t("group.create")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label={t("inbox.title")}
          onClick={() => setInboxOpen(true)}
        >
          <AtSign className="size-4" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-3">
            <label className="mb-2 block px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {t("friends.addTitle")}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("friends.addPlaceholder")}
                className="pl-9"
              />
            </div>

            {query.trim().length >= 2 ? (
              <div className="mt-2 space-y-1">
                {isFetching ? (
                  <div className="space-y-2 p-1">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ) : (results ?? []).length === 0 ? (
                  <p className="px-2 py-3 text-[12px] text-muted-foreground">
                    {t("friends.noResults")}
                  </p>
                ) : (
                  results?.map((profile) => (
                    <PersonRow
                      key={profile.id}
                      profile={profile}
                      actions={
                        existingIds.has(profile.id) ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {t("friends.alreadyConnected")}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => add(profile)}
                          >
                            <UserPlus className="mr-1 size-3.5" />
                            {t("friends.add")}
                          </Button>
                        )
                      }
                    />
                  ))
                )}
              </div>
            ) : null}
          </div>

          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                {t("friends.tabs.all")}
                {friends.length > 0 ? (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {friends.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="pending">
                {t("friends.tabs.pending")}
                {incoming.length > 0 ? (
                  <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                    {incoming.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="outgoing">{t("friends.tabs.sent")}</TabsTrigger>
              <TabsTrigger value="blocked">{t("friends.tabs.blocked")}</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="pt-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : friends.length === 0 ? (
                <EmptyState
                  className="py-10"
                  icon={<UserPlus className="size-5" />}
                  title={t("friends.emptyTitle")}
                  description={t("friends.emptyBody")}
                />
              ) : (
                <div className="space-y-1">
                  {friends.map((profile) => (
                    <PersonRow
                      key={profile.id}
                      profile={profile}
                      actions={
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label={t("friends.message")}
                            onClick={() => void openDm(profile.id)}
                          >
                            <MessageSquare className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn("size-8 text-muted-foreground")}
                            aria-label={t("friends.remove")}
                            onClick={() => remove.mutate({ otherId: profile.id })}
                          >
                            <UserRoundX className="size-4" />
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-1 pt-3">
              {incoming.length === 0 ? (
                <EmptyState
                  className="py-10"
                  title={t("friends.noRequests")}
                  description={t("friends.noRequestsBody")}
                />
              ) : (
                incoming.map((edge) => renderEdge(edge, "incoming"))
              )}
            </TabsContent>

            <TabsContent value="outgoing" className="space-y-1 pt-3">
              {outgoing.length === 0 ? (
                <EmptyState
                  className="py-10"
                  title={t("friends.noSent")}
                  description={t("friends.noSentBody")}
                />
              ) : (
                outgoing.map((edge) => renderEdge(edge, "outgoing"))
              )}
            </TabsContent>

            <TabsContent value="blocked" className="space-y-1 pt-3">
              {blocked.length === 0 ? (
                <EmptyState
                  className="py-10"
                  title={t("friends.noBlocked")}
                  description={t("friends.noBlockedBody")}
                />
              ) : (
                blocked.map((edge) => renderEdge(edge, "blocked"))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
