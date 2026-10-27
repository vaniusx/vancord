import { Check, Copy, Hash, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateChannel,
  useCreateServer,
  useDeleteServer,
  useJoinServer,
  useLeaveServer,
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
    const value = code.trim();
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

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success(t("invites.copied"));
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("invites.title", { server: server?.name ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("invites.body")}</DialogDescription>
        </DialogHeader>

        {!server ? null : canManage ? (
          <div className="space-y-3">
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
                    onSuccess: (code) => void copy(code),
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
                <div className="max-h-52 space-y-1 overflow-y-auto">
                  {invites?.map((invite) => (
                    <div
                      key={invite.code}
                      className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5"
                    >
                      <code className="flex-1 truncate font-mono text-[12px]">
                        {invite.code}
                      </code>
                      <span className="text-[10.5px] text-muted-foreground tabular-nums">
                        {invite.uses}/{invite.max_uses ?? "Ã¢Ë†Â"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label={t("invites.copy")}
                        onClick={() => void copy(invite.code)}
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
                        className="size-7 text-muted-foreground hover:text-destructive"
                        aria-label={t("invites.revoke")}
                        onClick={() =>
                          revokeInvite.mutate({
                            code: invite.code,
                            serverId: server.id,
                          })
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
          <p className="text-[13px] text-muted-foreground">
            {t("invites.noPermission")}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
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

  const submit = () => {
    if (!serverId || !name.trim()) return;
    createChannel.mutate(
      { serverId, name, topic },
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

          <div className="space-y-1.5">
            <Label htmlFor="channel-topic">{t("channels.topic")}</Label>
            <Input
              id="channel-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder={t("channels.topicPlaceholder")}
            />
          </div>
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
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const leaveServer = useLeaveServer();
  const [confirming, setConfirming] = useState<"delete" | "leave" | null>(null);

  if (!server) return null;

  const isOwner = server.role === "owner";

  const save = () => {
    const value = name.trim();
    if (!value || value === server.name) return;
    updateServer.mutate(
      { serverId: server.id, name: value },
      {
        onSuccess: () => toast.success(t("common.saved")),
        onError: () => toast.error(t("common.error")),
      },
    );
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("servers.settings")}</DialogTitle>
          <DialogDescription>
            {t("servers.memberCount", { count: memberCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="server-rename">{t("servers.name")}</Label>
            <div className="flex gap-2">
              <Input
                id="server-rename"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") save();
                }}
              />
              <Button
                onClick={save}
                disabled={!name.trim() || name.trim() === server.name || updateServer.isPending}
              >
                {updateServer.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-[12px] font-semibold text-destructive">
              {t("servers.dangerZone")}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {isOwner ? t("servers.deleteWarning") : t("servers.leaveWarning")}
            </p>

            {confirming ? (
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={destroy}>
                  {t("common.confirm")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                  {t("common.cancel")}
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirming(isOwner ? "delete" : "leave")}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                {isOwner ? t("servers.delete") : t("servers.leave")}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
