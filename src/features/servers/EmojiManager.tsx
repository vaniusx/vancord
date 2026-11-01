import { Loader2, Plus, Trash2, Upload } from "@/components/icons";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useServerPerks } from "@/features/servers/use-roles";
import { publicUrl, requireSupabase } from "@/lib/supabase";
import { uploadEmoji, uploadSticker } from "@/lib/upload";
import { cn } from "@/lib/utils";

interface ServerEmoji {
  id: string;
  name: string;
  storage_path: string;
  animated: boolean;
}

interface ServerSticker {
  id: string;
  name: string;
  storage_path: string;
  description: string | null;
}

const emojisKey = (serverId: string | undefined) => ["emojis", serverId] as const;
const stickersKey = (serverId: string | undefined) => ["stickers", serverId] as const;

function useEmojis(serverId: string | undefined) {
  return useQuery({
    queryKey: emojisKey(serverId),
    enabled: Boolean(serverId),
    queryFn: async (): Promise<ServerEmoji[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_emojis")
        .select("id, name, storage_path, animated")
        .eq("server_id", serverId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ServerEmoji[];
    },
  });
}

function useStickers(serverId: string | undefined) {
  return useQuery({
    queryKey: stickersKey(serverId),
    enabled: Boolean(serverId),
    queryFn: async (): Promise<ServerSticker[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_stickers")
        .select("id, name, storage_path, description")
        .eq("server_id", serverId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ServerSticker[];
    },
  });
}

function sanitizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export function EmojiManager({
  serverId,
  canManage,
}: {
  serverId: string;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: emojis } = useEmojis(serverId);
  const { data: stickers } = useStickers(serverId);
  const { data: perks } = useServerPerks(serverId);
  const emojiInput = useRef<HTMLInputElement>(null);
  const stickerInput = useRef<HTMLInputElement>(null);
  const [emojiName, setEmojiName] = useState("");
  const [stickerName, setStickerName] = useState("");
  const [busy, setBusy] = useState<"emoji" | "sticker" | null>(null);

  const slots = (perks?.emoji_slots as number | undefined) ?? 5;
  const used = emojis?.length ?? 0;
  const full = used >= slots;

  const removeEmoji = useMutation({
    mutationFn: async (id: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.from("server_emojis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emojisKey(serverId) });
    },
  });

  const removeSticker = useMutation({
    mutationFn: async (id: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.from("server_stickers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stickersKey(serverId) });
    },
  });

  const addEmoji = async (file: File | undefined) => {
    if (!file || !user) return;
    const name = sanitizeName(emojiName || file.name.replace(/\.[^.]+$/, ""));
    if (name.length < 2) {
      toast.error(t("emoji.nameTooShort"));
      return;
    }
    setBusy("emoji");
    try {
      const { path, animated } = await uploadEmoji(file, serverId, name);
      const supabase = requireSupabase();
      const { error } = await supabase.from("server_emojis").insert({
        server_id: serverId,
        name,
        storage_path: path,
        animated,
        created_by: user.id,
      });
      if (error) throw error;
      setEmojiName("");
      void queryClient.invalidateQueries({ queryKey: emojisKey(serverId) });
      toast.success(t("emoji.added"));
    } catch (error) {
      toast.error(
        String(error).includes("emoji_slots_full")
          ? t("emoji.slotsFull", { slots })
          : t("common.error"),
      );
    } finally {
      setBusy(null);
    }
  };

  const addSticker = async (file: File | undefined) => {
    if (!file || !user) return;
    const name = (stickerName || file.name.replace(/\.[^.]+$/, "")).slice(0, 32);
    setBusy("sticker");
    try {
      const { path } = await uploadSticker(file, serverId);
      const supabase = requireSupabase();
      const { error } = await supabase.from("server_stickers").insert({
        server_id: serverId,
        name,
        storage_path: path,
        created_by: user.id,
      });
      if (error) throw error;
      setStickerName("");
      void queryClient.invalidateQueries({ queryKey: stickersKey(serverId) });
      toast.success(t("emoji.added"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold">{t("emoji.title")}</p>
          <p className="text-[11.5px] text-muted-foreground tabular-nums">
            {used}/{slots}
          </p>
        </div>
        <p className="text-[11.5px] text-muted-foreground">{t("emoji.body")}</p>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full", full ? "bg-destructive" : "bg-primary")}
            style={{ width: `${Math.min(100, (used / slots) * 100)}%` }}
          />
        </div>
      </div>

      {canManage ? (
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="emoji-name">{t("emoji.name")}</Label>
            <Input
              id="emoji-name"
              value={emojiName}
              placeholder="cat_wave"
              maxLength={32}
              onChange={(event) => setEmojiName(event.target.value)}
            />
          </div>
          <Button
            size="sm"
            className="h-9"
            disabled={busy === "emoji" || full}
            onClick={() => emojiInput.current?.click()}
          >
            {busy === "emoji" ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 size-3.5" />
            )}
            {t("emoji.upload")}
          </Button>
          <input
            ref={emojiInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              void addEmoji(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      {(emojis ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground">
          {t("emoji.none")}
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {(emojis ?? []).map((emoji) => (
            <div
              key={emoji.id}
              className="group relative flex aspect-square items-center justify-center rounded-lg border border-border/70 bg-card/60 p-1.5"
              title={`:${emoji.name}:`}
            >
              <img
                src={publicUrl("emojis", emoji.storage_path)}
                alt={emoji.name}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
              {canManage ? (
                <button
                  type="button"
                  onClick={() => removeEmoji.mutate(emoji.id)}
                  aria-label={t("common.remove")}
                  className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-3 text-destructive" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-border/60 pt-4">
        <p className="text-[13px] font-semibold">{t("emoji.stickersTitle")}</p>
        <p className="text-[11.5px] text-muted-foreground">{t("emoji.stickersBody")}</p>

        {canManage ? (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="sticker-name">{t("emoji.name")}</Label>
              <Input
                id="sticker-name"
                value={stickerName}
                maxLength={32}
                onChange={(event) => setStickerName(event.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              disabled={busy === "sticker"}
              onClick={() => stickerInput.current?.click()}
            >
              {busy === "sticker" ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-3.5" />
              )}
              {t("emoji.upload")}
            </Button>
            <input
              ref={stickerInput}
              type="file"
              accept="image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                void addSticker(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        ) : null}

        {(stickers ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground">
            {t("emoji.noStickers")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(stickers ?? []).map((sticker) => (
              <div
                key={sticker.id}
                className="group relative flex aspect-square items-center justify-center rounded-lg border border-border/70 bg-card/60 p-2"
                title={sticker.name}
              >
                <img
                  src={publicUrl("stickers", sticker.storage_path)}
                  alt={sticker.name}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => removeSticker.mutate(sticker.id)}
                    aria-label={t("common.remove")}
                    className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
