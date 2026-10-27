import { Hash, MessageSquare, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/features/app/app-store";
import { useDms } from "@/features/dm/use-dms";
import { useAllChannels, useServers } from "@/features/servers/use-servers";
import type { ProfileSummary } from "@/lib/models";
import { cn } from "@/lib/utils";

type Item =
  | {
      kind: "channel";
      id: string;
      label: string;
      hint: string;
      to: string;
    }
  | {
      kind: "dm";
      id: string;
      label: string;
      hint: string;
      to: string;
      profile: ProfileSummary;
    };

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useAppStore((state) => state.paletteOpen);
  const setOpen = useAppStore((state) => state.setPaletteOpen);
  const { data: servers } = useServers();
  const { data: channels } = useAllChannels();
  const { data: dms } = useDms();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const serverNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const server of servers ?? []) map.set(server.id, server.name);
    return map;
  }, [servers]);

  const items = useMemo<Item[]>(() => {
    const term = query.trim().toLowerCase();

    const channelItems: Item[] = (channels ?? [])
      .filter((channel) => channel.server_id && channel.name)
      .filter((channel) => !term || channel.name!.toLowerCase().includes(term))
      .slice(0, term ? 20 : 8)
      .map((channel) => ({
        kind: "channel",
        id: channel.id,
        label: `#${channel.name}`,
        hint: serverNames.get(channel.server_id!) ?? "",
        to: `/s/${channel.server_id}/${channel.id}`,
      }));

    const dmItems: Item[] = (dms ?? [])
      .map((dm) => dm.members[0])
      .filter((profile): profile is ProfileSummary => Boolean(profile))
      .filter(
        (profile) =>
          !term ||
          profile.display_name.toLowerCase().includes(term) ||
          profile.username.toLowerCase().includes(term),
      )
      .map((profile) => {
        const dm = (dms ?? []).find((channel) => channel.members[0]?.id === profile.id);
        return {
          kind: "dm" as const,
          id: dm?.id ?? profile.id,
          label: profile.display_name,
          hint: `@${profile.username}`,
          to: `/dm/${dm?.id ?? ""}`,
          profile,
        };
      });

    return [...channelItems, ...dmItems];
  }, [channels, dms, query, serverNames]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const choose = (item: Item) => {
    setOpen(false);
    navigate(item.to);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t("palette.title")}</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIndex((current) => Math.min(current + 1, items.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setIndex((current) => Math.max(current - 1, 0));
              }
              if (event.key === "Enter" && items[index]) {
                event.preventDefault();
                choose(items[index]);
              }
            }}
            placeholder={t("palette.placeholder")}
            className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
              {t("palette.empty")}
            </p>
          ) : (
            items.map((item, itemIndex) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onMouseEnter={() => setIndex(itemIndex)}
                onClick={() => choose(item)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  itemIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/90",
                )}
              >
                {item.kind === "channel" ? (
                  <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <Hash className="size-3.5" />
                  </span>
                ) : item.profile ? (
                  <Avatar profile={item.profile} size="sm" />
                ) : (
                  <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <UserRound className="size-3.5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {item.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.hint}
                  </span>
                </span>
                {item.kind === "dm" ? (
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
