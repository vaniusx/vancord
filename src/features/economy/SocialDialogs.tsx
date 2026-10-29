import { AtSign, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Avatar } from "@/components/common/avatar";
import { useCurrentUser } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFriendships } from "@/features/friends/use-friends";
import { useMentionInbox, useStartGroupDm } from "@/features/messages/use-chat-extras";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function InboxDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inbox = useMentionInbox();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <AtSign className="size-4 text-primary" />
            {t("inbox.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("inbox.title")}</DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin max-h-[52vh] min-h-[140px] overflow-y-auto p-2">
          {inbox.isPending ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (inbox.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-[12.5px] text-muted-foreground">
              {t("inbox.empty")}
            </p>
          ) : (
            (inbox.data ?? []).map((item) => (
              <button
                key={item.message_id}
                type="button"
                onClick={() => {
                  navigate(`/dm/${item.channel_id}`);
                  onOpenChange(false);
                }}
                className="mb-1 w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/60"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-[12.5px] font-medium">{item.author_name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    #{item.channel_name ?? "dm"} · {relativeTime(item.created_at)}
                  </span>
                </div>
                <p className="line-clamp-2 text-[12.5px] text-muted-foreground">{item.content}</p>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GroupDmDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (channelId: string) => void;
}) {
  const { t } = useTranslation();
  const { data: friends } = useFriendships();
  const currentUser = useCurrentUser();
  const start = useStartGroupDm();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const accepted = (friends ?? []).filter((edge) => edge.status === "accepted");
  const people = accepted
    .map((edge) =>
      edge.requester_id === currentUser?.id ? edge.addressee : edge.requester,
    )
    .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  const submit = () => {
    if (selected.length < 1) {
      toast.error(t("group.needTwo"));
      return;
    }
    if (selected.length > 9) {
      toast.error(t("group.tooMany"));
      return;
    }
    start.mutate(
      { memberIds: selected, name: name.trim() || undefined },
      {
        onSuccess: (channelId) => {
          toast.success(t("group.created"));
          setSelected([]);
          setName("");
          onOpenChange(false);
          onCreated?.(channelId);
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Users className="size-4 text-primary" />
            {t("group.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("group.title")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="group-name">{t("group.name")}</Label>
          <Input
            id="group-name"
            value={name}
            maxLength={64}
            placeholder={t("group.nameHint")}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("group.select")}</Label>
          <div className="scrollbar-thin max-h-56 overflow-y-auto rounded-lg border border-border/60 p-1">
            {people.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
                {t("friends.empty")}
              </p>
            ) : (
              people.map((person) => {
                const active = selected.includes(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => toggle(person.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
                      active ? "bg-primary/10" : "hover:bg-accent/60",
                    )}
                  >
                    <Avatar profile={person} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{person.display_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {active ? "✓" : ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={submit} disabled={start.isPending}>
            {start.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            {t("group.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
