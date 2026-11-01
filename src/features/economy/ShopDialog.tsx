import {
  BadgeCheck,
  Check,
  Crown,
  Flame,
  Frame,
  Gift,
  Loader2,
  Palette,
  Sparkles,
  Type,
} from "@/components/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/features/profiles/use-profile";
import {
  useClaimDaily,
  useEconomy,
  useGift,
  useMembershipPerks,
  usePurchase,
  useShop,
} from "@/features/servers/use-roles";
import type { ShopItem } from "@/lib/models";
import { relativeTime } from "@/lib/format";
import { playCue } from "@/lib/sounds";
import { cn } from "@/lib/utils";

type Tab = "plans" | "frames" | "themes" | "badges" | "plates";

function FramePreview({
  preview,
  profile,
}: {
  preview: Record<string, unknown>;
  profile: Parameters<typeof Avatar>[0]["profile"];
}) {
  const outer = String(preview.outer ?? "#9CA3AF");
  const inner = String(preview.inner ?? "#4B5563");
  const style = String(preview.style ?? "solid");

  return (
    <div className="relative inline-flex items-center justify-center">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-full",
          style === "glow" && "blur-[6px]",
        )}
        style={{
          padding: 3,
          background: `conic-gradient(from 0deg, ${outer}, ${inner}, ${outer})`,
          maskImage:
            "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          WebkitMaskImage:
            "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
        }}
      />
      <Avatar profile={profile} size="lg" className="relative" />
    </div>
  );
}

function PlanColumn({
  tier,
  perks,
  active,
  price,
  onBuy,
  busy,
}: {
  tier: "plus" | "ultra";
  perks: Record<string, unknown> | undefined;
  active: boolean;
  price: number;
  onBuy: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const ultra = tier === "ultra";

  const rows: Array<{ key: string; label: string }> = [
    { key: "animated_avatar", label: t("store.perkAnimatedAvatar") },
    { key: "animated_banner", label: t("store.perkAnimatedBanner") },
    { key: "upload_mb", label: t("store.perkUpload") },
    { key: "stream_quality", label: t("store.perkStream") },
    { key: "custom_accent", label: t("store.perkAccent") },
    { key: "profile_theme", label: t("store.perkProfileTheme") },
    { key: "avatar_frame", label: t("store.perkFrame") },
    { key: "soundboard", label: t("store.perkSoundboard") },
  ];

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-3.5",
        ultra ? "border-[#B06A2E]/50 bg-[#B06A2E]/6" : "border-primary/35 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2">
        {ultra ? (
          <Crown className="size-4 text-[#B06A2E]" />
        ) : (
          <Sparkles className="size-4 text-primary" />
        )}
        <p className="text-[13.5px] font-semibold">{ultra ? "Vancord Ultra" : "Vancord+"}</p>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{t("store.thirtyDays")}</p>

      <div className="mt-3 space-y-1.5">
        {rows.map((row) => {
          const value = perks?.[row.key];
          const enabled = value === true || (typeof value === "number" && value > 0) || typeof value === "string";
          const detail =
            typeof value === "number"
              ? `${value} MB`
              : typeof value === "string"
                ? value
                : null;

          return (
            <div key={row.key} className="flex items-center gap-1.5 text-[11.5px]">
              <span
                className={cn(
                  "flex size-3.5 shrink-0 items-center justify-center rounded-full",
                  enabled ? "bg-status-online/15 text-status-online" : "bg-secondary text-muted-foreground",
                )}
              >
                {enabled ? <Check className="size-2.5" /> : <span className="size-1 rounded-full bg-current" />}
              </span>
              <span className={cn("flex-1 truncate", !enabled && "text-muted-foreground/70")}>
                {row.label}
              </span>
              {detail ? <span className="shrink-0 text-[10.5px] text-muted-foreground">{detail}</span> : null}
            </div>
          );
        })}
      </div>

      <Button
        size="sm"
        className="mt-3 h-8"
        variant={active ? "outline" : ultra ? "default" : "default"}
        disabled={active || busy}
        onClick={onBuy}
      >
        {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
        {active ? t("store.active") : `${price.toLocaleString()} · ${t("economy.buy")}`}
      </Button>
    </div>
  );
}

export function ShopDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: economy } = useEconomy();
  const { data: shop } = useShop();
  const { data: perkTable } = useMembershipPerks();
  const { data: profile } = useProfile();
  const purchase = usePurchase();
  const claim = useClaimDaily();
  const gift = useGift();
  const [tab, setTab] = useState<Tab>("plans");
  const [giftFor, setGiftFor] = useState<ShopItem | null>(null);
  const [giftUsername, setGiftUsername] = useState("");

  const balance = economy?.balance ?? 0;
  const membership = economy?.membership;
  const owned = new Set(economy?.cosmetics ?? []);
  const dailyClaimed = (economy?.history ?? []).some(
    (entry) =>
      entry.reason === "daily" &&
      new Date(entry.createdAt).toDateString() === new Date().toDateString(),
  );

  const items = shop ?? [];
  const plans = items.filter((item) => item.family === "membership");
  const frames = items.filter((item) => item.family === "frame");
  const themes = items.filter((item) => item.family === "theme");
  const badges = items.filter((item) => item.family === "badge");
  const plates = items.filter((item) => item.family === "plate");

  const buy = (item: ShopItem) => {
    purchase.mutate(item.sku, {
      onSuccess: () => {
        playCue("success");
        toast.success(t("economy.bought"));
      },
      onError: (error) =>
        toast.error(
          String(error).includes("insufficient_points")
            ? t("economy.notEnough")
            : t("common.error"),
        ),
    });
  };

  const nameOf = (item: ShopItem) =>
    language === "tr" ? item.name_tr : item.name_en;
  const descriptionOf = (item: ShopItem) =>
    language === "tr" ? item.description_tr : item.description_en;

  const tabs: Array<{ id: Tab; label: string; icon: typeof Sparkles }> = [
    { id: "plans", label: t("store.plans"), icon: Sparkles },
    { id: "frames", label: t("store.frames"), icon: Frame },
    { id: "themes", label: t("store.themes"), icon: Palette },
    { id: "badges", label: t("store.badges"), icon: BadgeCheck },
    { id: "plates", label: t("store.plates"), icon: Type },
  ];

  const renderCosmetic = (item: ShopItem) => {
    const isOwned = owned.has(item.sku);
    const affordable = balance >= item.price;
    const preview = item.preview ?? {};

    return (
      <div
        key={item.sku}
        className={cn(
          "flex flex-col gap-2 rounded-xl border p-2.5",
          isOwned ? "border-primary/40 bg-primary/5" : "border-border/70",
        )}
      >
        <div className="flex h-[68px] items-center justify-center rounded-lg bg-secondary/50">
          {item.family === "frame" && profile ? (
            <FramePreview preview={preview} profile={profile} />
          ) : item.family === "plate" ? (
            <span
              className="text-[15px] font-semibold"
              style={{ color: String(preview.color ?? "var(--foreground)") }}
            >
              {profile?.display_name ?? "Vancord"}
            </span>
          ) : item.family === "theme" ? (
            <div className="flex gap-1">
              {["#1F5F52", "#2F4A6D", "#A15430", "#8C4362", "#17605C"].map((color) => (
                <span
                  key={color}
                  className="size-5 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          ) : (
            <Flame className="size-6 text-[var(--signal)]" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold">{nameOf(item)}</p>
          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {descriptionOf(item)}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-7 flex-1 text-[11.5px]"
            variant={isOwned ? "outline" : affordable ? "default" : "ghost"}
            disabled={isOwned || !affordable || purchase.isPending}
            onClick={() => buy(item)}
          >
            {isOwned
              ? t("economy.owned")
              : affordable
                ? `${item.price.toLocaleString()}`
                : t("economy.notEnough")}
          </Button>
          {!isOwned && affordable ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              aria-label={t("store.gift")}
              onClick={() => {
                setGiftFor(item);
                setGiftUsername("");
              }}
            >
              <Gift className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[88vh] max-h-[780px] gap-0 overflow-hidden p-0 sm:max-w-[820px]">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Sparkles className="size-4 text-primary" />
            {t("store.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("store.title")}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[168px] shrink-0 flex-col border-r border-border/60 bg-sidebar/70 p-2">
            <div className="mb-2 rounded-lg bg-primary/8 px-2.5 py-2">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t("economy.balance")}
              </p>
              <p className="text-[18px] leading-tight font-semibold tabular-nums">
                {balance.toLocaleString(language)}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-1.5 h-6 w-full text-[10.5px]"
                disabled={claim.isPending || dailyClaimed}
                onClick={() =>
                  claim.mutate(undefined, {
                    onSuccess: (amount) => {
                      if (amount > 0) toast.success(t("economy.dailyReward", { amount }));
                      else toast.info(t("economy.dailyClaimed"));
                    },
                  })
                }
              >
                {dailyClaimed ? t("economy.dailyClaimed") : t("economy.daily")}
              </Button>
            </div>

            {membership ? (
              <div className="mb-2 rounded-lg border border-primary/30 bg-primary/6 px-2 py-1.5">
                <p className="text-[11px] font-semibold text-primary">
                  {membership.tier === "ultra" ? "Vancord Ultra" : "Vancord+"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(membership.expiresAt).toLocaleDateString(language)}
                </p>
              </div>
            ) : null}

            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? "page" : undefined}
                  className={cn(
                    "mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                    tab === item.id
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </aside>

          <section className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "plans" ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[13px] font-semibold">{t("store.plansTitle")}</p>
                  <p className="text-[11.5px] text-muted-foreground">{t("store.plansBody")}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PlanColumn
                    tier="plus"
                    perks={perkTable?.plus}
                    active={membership?.tier === "plus"}
                    price={plans.find((item) => item.sku.includes("plus"))?.price ?? 3000}
                    busy={purchase.isPending}
                    onBuy={() => {
                      const plan = plans.find((item) => item.sku.includes("plus"));
                      if (plan) buy(plan);
                    }}
                  />
                  <PlanColumn
                    tier="ultra"
                    perks={perkTable?.ultra}
                    active={membership?.tier === "ultra"}
                    price={plans.find((item) => item.sku.includes("ultra"))?.price ?? 6000}
                    busy={purchase.isPending}
                    onBuy={() => {
                      const plan = plans.find((item) => item.sku.includes("ultra"));
                      if (plan) buy(plan);
                    }}
                  />
                </div>

                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-[11.5px] font-semibold">{t("economy.howToEarn")}</p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                    <li>· {t("economy.howMessages")}</li>
                    <li>· {t("economy.howVoice")}</li>
                    <li>· {t("economy.howDaily")}</li>
                  </ul>
                </div>
              </div>
            ) : null}

            {tab === "frames" ? (
              <div className="space-y-2.5">
                <p className="text-[11.5px] text-muted-foreground">{t("store.framesBody")}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {frames.map(renderCosmetic)}
                </div>
              </div>
            ) : null}

            {tab === "themes" ? (
              <div className="space-y-2.5">
                <p className="text-[11.5px] text-muted-foreground">{t("store.themesBody")}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {themes.map(renderCosmetic)}
                </div>
              </div>
            ) : null}

            {tab === "badges" ? (
              <div className="space-y-2.5">
                <p className="text-[11.5px] text-muted-foreground">{t("store.badgesBody")}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {badges.map(renderCosmetic)}
                </div>
              </div>
            ) : null}

            {tab === "plates" ? (
              <div className="space-y-2.5">
                <p className="text-[11.5px] text-muted-foreground">{t("store.platesBody")}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {plates.map(renderCosmetic)}
                </div>
              </div>
            ) : null}

            {(economy?.history ?? []).length > 0 ? (
              <div className="mt-4 border-t border-border/60 pt-3">
                <p className="mb-1.5 text-[11.5px] font-semibold">{t("economy.history")}</p>
                <div className="space-y-0.5">
                  {(economy?.history ?? []).slice(0, 6).map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"
                    >
                      <span className="min-w-0 flex-1 truncate">{entry.reason}</span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          entry.amount > 0 ? "text-status-online" : "text-foreground",
                        )}
                      >
                        {entry.amount > 0 ? "+" : ""}
                        {entry.amount}
                      </span>
                      <span className="shrink-0 text-[10px]">
                        {relativeTime(entry.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <Dialog
          open={Boolean(giftFor)}
          onOpenChange={(value) => (value ? null : setGiftFor(null))}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-[14px]">
                {giftFor ? t("store.giftTitle", { name: nameOf(giftFor) }) : ""}
              </DialogTitle>
              <DialogDescription className="text-[12px]">
                {t("store.giftBody")}
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={giftUsername}
              placeholder={t("store.giftUsername")}
              onChange={(event) => setGiftUsername(event.target.value.toLowerCase())}
            />
            <Button
              size="sm"
              disabled={!giftUsername.trim() || gift.isPending}
              onClick={async () => {
                if (!giftFor) return;
                try {
                  const { requireSupabase } = await import("@/lib/supabase");
                  const supabase = requireSupabase();
                  const { data } = await supabase.rpc("find_user_by_username", {
                    target_username: giftUsername.trim(),
                  });
                  const found = (data ?? [])[0] as { id: string } | undefined;
                  if (!found) {
                    toast.error(t("store.giftNotFound"));
                    return;
                  }
                  gift.mutate(
                    { sku: giftFor.sku, recipientId: found.id },
                    {
                      onSuccess: () => {
                        playCue("gift");
                        toast.success(t("store.giftSent"));
                        setGiftFor(null);
                      },
                      onError: () => toast.error(t("economy.notEnough")),
                    },
                  );
                } catch {
                  toast.error(t("common.error"));
                }
              }}
            >
              <Gift className="mr-1.5 size-3.5" />
              {t("store.giftSend")}
            </Button>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
