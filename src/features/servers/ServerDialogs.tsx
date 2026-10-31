import { Check, Copy, Hash, Loader2, Plus, Trash2, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { BotDirectory } from "@/features/bots/BotDirectory";
import { OfficialBotPanel } from "@/features/bots/OfficialBotPanel";
import { BoostPanel, RoleEditor } from "@/features/servers/RoleEditor";
import { EventsPanel } from "@/features/events/EventsPanel";
import { EmojiManager } from "@/features/servers/EmojiManager";
import { VanitySlugEditor } from "@/features/servers/VanitySlugEditor";
import { useBoostLevel } from "@/features/servers/use-roles";
import { ModerationSettings } from "@/features/moderation/ModerationSettings";
import { useProfile } from "@/features/profiles/use-profile";
import { accentFor, initials } from "@/lib/format";
import { extractInviteCode, inviteLink, vanityLink } from "@/lib/invites";
import { publicUrl } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { uploadServerIcon } from "@/lib/upload";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useChannels,
  useCreateChannel,
  useCreateServer,
  useDeleteServer,
  useJoinServer,
  useLeaveServer,
  useMembers,
  useUpdateServer,
} from "@/features/servers/use-servers";
import {
  useCreateInvite,
  useInvites,
  useRevokeInvite,
} from "@/features/invites/use-invites";
import type { ServerSummary } from "@/lib/models";

export function CreateServerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createServer = useCreateServer();
  const [name, setName] = useState("");

  const submit = () => {
    const value = name.trim();
    if (!value) return;
    createServer.mutate(value, {
      onSuccess: (serverId) => {
        onOpenChange(false);
        setName("");
        navigate(`/s/${serverId}`);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("servers.createTitle")}</DialogTitle>
          <DialogDescription>{t("servers.createBody")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="server-name">{t("servers.name")}</Label>
          <Input
            id="server-name"
            autoFocus
            value={name}
            maxLength={100}
            placeholder={t("servers.namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || createServer.isPending}>
            {createServer.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("servers.create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function JoinServerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const joinServer = useJoinServer();
  const [code, setCode] = useState("");

  const submit = () => {
    // Accept a pasted link, a deep link or a bare code.
    const value = extractInviteCode(code);
    if (!value) return;
    joinServer.mutate(value, {
      onSuccess: (serverId) => {
        onOpenChange(false);
        setCode("");
        navigate(`/s/${serverId}`);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("expired")) toast.error(t("invites.errors.expired"));
        else if (message.includes("exhausted"))
          toast.error(t("invites.errors.exhausted"));
        else toast.error(t("invites.errors.invalid"));
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("servers.joinTitle")}</DialogTitle>
          <DialogDescription>{t("servers.joinBody")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="invite-code">{t("invites.code")}</Label>
          <Input
            id="invite-code"
            autoFocus
            value={code}
            placeholder="a1b2c3d4e5f6"
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            className="font-mono"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!code.trim() || joinServer.isPending}>
            {joinServer.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("servers.join")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InviteDialog({
  open,
  onOpenChange,
  server,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: ServerSummary | undefined;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const { data: invites } = useInvites(server?.id, open && canManage);
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const [expiry, setExpiry] = useState("24");
  const [uses, setUses] = useState("10");
  const [copied, setCopied] = useState<string | null>(null);

  // A link is what people actually paste into a chat, so that is the primary
  // copy action; the bare code stays available for typing by hand.
  const copyLink = async (code: string) => {
    await navigator.clipboard.writeText(inviteLink(code));
    setCopied(code);
    toast.success(t("invites.copied"));
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("invites.title", { server: server?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("invites.body")}</DialogDescription>
        </DialogHeader>

        {!server ? null : canManage ? (
          <div className="space-y-3">
            {server.vanity_slug ? (
              <div className="rounded-lg border border-primary/25 bg-primary/6 p-2.5">
                <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                  {t("invites.vanity")}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate text-[12px]">
                    {vanityLink(server.vanity_slug)}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    aria-label={t("invites.copy")}
                    onClick={() => {
                      void navigator.clipboard.writeText(vanityLink(server.vanity_slug!));
                      toast.success(t("invites.copied"));
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("invites.expiry")}</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t("invites.expiry1h")}</SelectItem>
                    <SelectItem value="24">{t("invites.expiry24h")}</SelectItem>
                    <SelectItem value="168">{t("invites.expiry7d")}</SelectItem>
                    <SelectItem value="0">{t("invites.expiryNever")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("invites.maxUses")}</Label>
                <Select value={uses} onValueChange={setUses}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={createInvite.isPending}
              onClick={() =>
                createInvite.mutate(
                  {
                    serverId: server.id,
                    expiresInHours: Number(expiry) || null,
                    maxUses: Number(uses) || null,
                  },
                  {
                    onSuccess: (code) => void copyLink(code),
                    onError: () => toast.error(t("common.error")),
                  },
                )
              }
            >
              {createInvite.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              {t("invites.generate")}
            </Button>

            <div className="space-y-1.5">
              <Label>{t("invites.active")}</Label>
              {(invites ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
                  {t("invites.none")}
                </p>
              ) : (
                <div className="scrollbar-thin max-h-52 space-y-1 overflow-y-auto">
                  {invites?.map((invite) => (
                    <div
                      key={invite.code}
                      className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5"
                    >
                      <code className="min-w-0 flex-1 truncate font-mono text-[12px]">
                        {invite.code}
                      </code>
                      <span className="shrink-0 text-[10.5px] text-muted-foreground tabular-nums">
                        {invite.uses}/{invite.max_uses ?? "∞"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0"
                        aria-label={t("invites.copy")}
                        onClick={() => void copyLink(invite.code)}
                      >
                        {copied === invite.code ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={t("invites.revoke")}
                        onClick={() =>
                          revokeInvite.mutate({ code: invite.code, serverId: server.id })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">{t("invites.noPermission")}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  serverId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string | undefined;
}) {
  const { t } = useTranslation();
  const createChannel = useCreateChannel();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState<"text" | "voice">("text");

  const submit = () => {
    if (!serverId || !name.trim()) return;
    createChannel.mutate(
      { serverId, name, topic, type },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setTopic("");
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sidebar.createChannel")}</DialogTitle>
          <DialogDescription>{t("channels.createBody")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("text")}
              className={type === "text" ? "flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-left text-[12.5px] text-primary" : "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-[12.5px]"}
            >
              <Hash className="size-4" />
              {t("channels.typeText")}
            </button>
            <button
              type="button"
              onClick={() => setType("voice")}
              className={type === "voice" ? "flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-left text-[12.5px] text-primary" : "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-[12.5px]"}
            >
              <Volume2 className="size-4" />
              {t("channels.typeVoice")}
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="channel-name">{t("channels.name")}</Label>
            <div className="relative">
              <Hash className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="channel-name"
                autoFocus
                className="pl-9"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("channels.namePlaceholder")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
              />
            </div>
          </div>

          {type === "text" ? (
            <div className="space-y-1.5">
              <Label htmlFor="channel-topic">{t("channels.topic")}</Label>
              <Input
                id="channel-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder={t("channels.topicPlaceholder")}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || createChannel.isPending}>
            {createChannel.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("common.create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SettingsTab =
  | "general"
  | "roles"
  | "emoji"
  | "events"
  | "boost"
  | "moderation"
  | "bots"
  | "danger";

export function ServerSettingsDialog({
  open,
  onOpenChange,
  server,
  memberCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: ServerSummary | undefined;
  memberCount: number;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState(server?.name ?? "");
  const [description, setDescription] = useState(server?.description ?? "");
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const leaveServer = useLeaveServer();
  const [confirming, setConfirming] = useState<"delete" | "leave" | null>(null);
  const [busy, setBusy] = useState<"icon" | "banner" | null>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const { data: profile } = useProfile();
  const { data: boost } = useBoostLevel(server?.id);
  const { data: channels } = useChannels(server?.id);
  const [tab, setTab] = useState<SettingsTab>("general");

  const isOwner = server?.role === "owner";
  const canManage = isOwner || server?.role === "admin";

  useEffect(() => {
    if (!server) return;
    setName(server.name);
    setDescription(server.description ?? "");
  }, [server?.id, server?.name, server?.description]);

  if (!server) return null;

  const save = () => {
    updateServer.mutate(
      {
        serverId: server.id,
        name: name.trim() || server.name,
        description: description.trim() || null,
      },
      { onSuccess: () => toast.success(t("common.saved")) },
    );
  };

  const onIcon = async (file: File | undefined) => {
    if (!file) return;
    setBusy("icon");
    try {
      const path = await uploadServerIcon(profile!.id, server.id, file);
      updateServer.mutate({ serverId: server.id, icon_url: publicUrl("icons", path) });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(null);
    }
  };

  const onBanner = async (file: File | undefined) => {
    if (!file) return;
    setBusy("banner");
    try {
      const path = await uploadServerIcon(profile!.id, `${server.id}-banner`, file);
      updateServer.mutate({ serverId: server.id, banner_url: publicUrl("banners", path) });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(null);
    }
  };

  const destroy = () => {
    if (confirming === "delete") {
      deleteServer.mutate(server.id, {
        onSuccess: () => {
          onOpenChange(false);
          navigate("/");
        },
      });
    }
    if (confirming === "leave") {
      leaveServer.mutate(server.id, {
        onSuccess: () => {
          onOpenChange(false);
          navigate("/");
        },
      });
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "general", label: t("serverSettings.general") },
    ...(canManage
      ? ([
          { id: "roles", label: t("serverSettings.roles") },
          { id: "emoji", label: t("serverSettings.emoji") },
          { id: "events", label: t("serverSettings.events") },
          { id: "boost", label: t("serverSettings.boost") },
          { id: "moderation", label: t("serverSettings.moderation") },
          { id: "bots", label: t("serverSettings.bots") },
          { id: "danger", label: t("serverSettings.danger") },
        ] as Array<{ id: SettingsTab; label: string }>)
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[86vh] max-h-[720px] gap-0 overflow-hidden p-0 sm:max-w-[860px]">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("servers.settings")}</DialogTitle>
          <DialogDescription>
            {t("servers.memberCount", { count: memberCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[190px] shrink-0 flex-col border-r border-border/60 bg-sidebar/70">
            <div className="px-3 pt-4 pb-2">
              <p className="truncate px-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {server.name}
              </p>
            </div>
            <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? "page" : undefined}
                  className={cn(
                    "mb-0.5 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
                    tab === item.id
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    item.id === "danger" && "text-destructive hover:text-destructive",
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {tab === item.id ? (
                    <span className="size-1.5 rounded-full bg-primary" />
                  ) : null}
                </button>
              ))}
            </nav>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-[52px] shrink-0 items-center border-b border-border/60 px-5">
              <h2 className="truncate text-[14.5px] font-semibold">
                {tabs.find((item) => item.id === tab)?.label ?? ""}
              </h2>
            </header>

            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {tab === "general" ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border border-border/70">
                    <button
                      type="button"
                      onClick={() => canManage && bannerRef.current?.click()}
                      disabled={!canManage}
                      className="relative flex h-24 w-full items-end justify-end p-2 transition-opacity hover:opacity-90 disabled:cursor-default disabled:hover:opacity-100"
                      style={
                        server.banner_url
                          ? {
                              backgroundImage: `url(${server.banner_url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : { backgroundColor: accentFor(server.id) }
                      }
                    >
                      <span className="rounded-md bg-black/35 px-2 py-1 text-[11px] font-medium text-white">
                        {busy === "banner" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          t("servers.changeBanner")
                        )}
                      </span>
                    </button>
                    <div className="flex items-center gap-3 px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => canManage && iconRef.current?.click()}
                        disabled={!canManage}
                        className="-mt-6 flex size-14 items-center justify-center overflow-hidden rounded-xl border-4 border-card text-[13px] font-semibold text-white disabled:cursor-default"
                        style={{ backgroundColor: accentFor(server.id) }}
                      >
                        {server.icon_url ? (
                          <img src={server.icon_url} alt="" className="size-full object-cover" />
                        ) : busy === "icon" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          initials(server.name)
                        )}
                      </button>
                      <p className="min-w-0 flex-1 truncate pt-4 text-[13px] font-semibold">
                        {server.name}
                      </p>
                    </div>
                  </div>

                  <input
                    ref={iconRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => void onIcon(event.target.files?.[0])}
                  />
                  <input
                    ref={bannerRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => void onBanner(event.target.files?.[0])}
                  />

                  {canManage ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="server-rename">{t("servers.name")}</Label>
                        <Input
                          id="server-rename"
                          value={name}
                          maxLength={100}
                          onChange={(event) => setName(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="server-description">{t("servers.description")}</Label>
                        <Textarea
                          id="server-description"
                          value={description}
                          rows={3}
                          maxLength={280}
                          placeholder={t("servers.descriptionPlaceholder")}
                          onChange={(event) => setDescription(event.target.value)}
                        />
                      </div>
                      <VanitySlugEditor
                        serverId={server.id}
                        slug={server.vanity_slug}
                        canUse={(boost?.level ?? 0) >= 2}
                        onSaved={(next) =>
                          updateServer.mutate({ serverId: server.id, vanity_slug: next })
                        }
                      />

                      <Button
                        onClick={save}
                        disabled={updateServer.isPending || !name.trim()}
                      >
                        {updateServer.isPending ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : null}
                        {t("common.save")}
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}

              {tab === "roles" ? <RoleEditor serverId={server.id} /> : null}
              {tab === "emoji" ? (
                <EmojiManager serverId={server.id} canManage={canManage} />
              ) : null}
              {tab === "events" ? (
                <EventsPanel
                  serverId={server.id}
                  channels={channels ?? []}
                  canManage={canManage}
                />
              ) : null}
              {tab === "boost" ? (
                <BoostPanel serverId={server.id} boostLevel={boost?.level ?? 0} />
              ) : null}
              {tab === "moderation" ? <ModerationSettings serverId={server.id} /> : null}
              {tab === "bots" ? (
                <div className="space-y-3">
                  <OfficialBotPanel serverId={server.id} />
                  <BotDirectory serverId={server.id} />
                </div>
              ) : null}

              {tab === "danger" ? (
                <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-[12px] font-semibold text-destructive">
                    {t("servers.dangerZone")}
                  </p>
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                    {isOwner ? t("servers.deleteWarning") : t("servers.leaveWarning")}
                  </p>
                  {confirming ? (
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" onClick={destroy}>
                        {t("common.confirm")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirming(null)}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirming(isOwner ? "delete" : "leave")}
                    >
                      {isOwner ? t("servers.delete") : t("servers.leave")}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type ServerDialogName =
  | "createServer"
  | "joinServer"
  | "invite"
  | "serverSettings"
  | "createChannel";

/** One lazily-loaded entry point for every server dialog. */
export function ServerDialogs({
  dialog,
  onClose,
  server,
  canManage,
}: {
  dialog: ServerDialogName | null;
  onClose: () => void;
  server: ServerSummary | undefined;
  canManage: boolean;
}) {
  // Read the roster here, only while a dialog is open, instead of in the shell.
  const { data: members } = useMembers(server?.id);
  const memberCount = members?.length ?? 0;
  if (!dialog) return null;

  const setOpen = () => (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <>
      {dialog === "createServer" ? (
        <CreateServerDialog open onOpenChange={setOpen()} />
      ) : null}
      {dialog === "joinServer" ? (
        <JoinServerDialog open onOpenChange={setOpen()} />
      ) : null}
      {dialog === "invite" ? (
        <InviteDialog
          open
          onOpenChange={setOpen()}
          server={server}
          canManage={canManage}
        />
      ) : null}
      {dialog === "createChannel" ? (
        <CreateChannelDialog
          open
          onOpenChange={setOpen()}
          serverId={server?.id}
        />
      ) : null}
      {dialog === "serverSettings" ? (
        <ServerSettingsDialog
          open
          onOpenChange={setOpen()}
          server={server}
          memberCount={memberCount}
        />
      ) : null}
    </>
  );
}