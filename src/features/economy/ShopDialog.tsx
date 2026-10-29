import {
  Crown,
  Flame,
  Gem,
  Gift,
  Loader2,
  Palette,
  Sparkles,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClaimDaily, useEconomy, usePurchase, useShop } from "@/features/servers/use-roles";
import type { ShopItem } from "@/lib/models";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function itemIcon(item: ShopItem) {
  if (item.kind === "boost") return Zap;
  if (item.kind === "theme") return Palette;
  if (item.kind === "cosmetic") {
    const icon = item.metadata?.icon;
    if (icon === "flame") return Flame;
    if (icon === "spark") return Sparkles;
    return Gem;
  }
  return item.sku.includes("ultra") ? Crown : Sparkles;
}

function planAccent(item: ShopItem) {
  if (item.sku.includes("ultra")) return "#B06A2E";
  if (item.sku.includes("plus")) return "#2E7F6E";
  if (item.kind === "boost") return "var(--signal)";
  return "var(--brand)";
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
  const purchase = usePurchase();
  const claim = useClaimDaily();

  const balance = economy?.balance ?? 0;
  const membership = economy?.membership;
  const owned = new Set(economy?.cosmetics ?? []);
  const dailyClaimed = (economy?.history ?? []).some(
    (entry) =>
      entry.reason === "daily" &&
      new Date(entry.createdAt).toDateString() === new Date().toDateString(),
  );

  const buy = (item: ShopItem) => {
    const name = language === "tr" ? item.name_tr : item.name_en;
    purchase.mutate(item.sku, {
      onSuccess: () => toast.success(t("economy.bought", { name })),
      onError: (error) =>
        toast.error(
          String(error).includes("insufficient_points")
            ? t("economy.notEnough")
            : t("common.error"),
        ),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[86vh] max-h-[760px] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeader className="border-b border-border/60 px-5 py-3.5">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Sparkles className="size-4 text-primary" />
            {t("economy.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("economy.title")}</DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-3 px-5 pt-4 sm:grid-cols-[168px_1fr]">
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                {t("economy.balance")}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {balance.toLocaleString(language)}
              </p>
              <p className="text-[11.5px] text-muted-foreground">{t("economy.points")}</p>

              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-7 w-full"
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
                {claim.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Gift className="mr-1.5 size-3.5" />
                )}
                {dailyClaimed ? t("economy.dailyClaimed") : t("economy.daily")}
              </Button>

              {membership ? (
                <div className="mt-3 rounded-lg bg-primary/10 px-2 py-1.5">
                  <p className="text-[11.5px] font-semibold text-primary">
                    {membership.tier === "ultra" ? "Vancord Ultra" : "Vancord+"}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {t("economy.expires")}: {new Date(membership.expiresAt).toLocaleDateString(language)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/70 p-3">
              <p className="text-[11.5px] font-semibold">{t("economy.howToEarn")}</p>
              <ul className="mt-1.5 space-y-1 text-[11.5px] text-muted-foreground">
                <li>· {t("economy.howMessages")}</li>
                <li>· {t("economy.howVoice")}</li>
                <li>· {t("economy.howDaily")}</li>
              </ul>
            </div>
          </div>

          <div className="grid gap-2 px-5 py-4 sm:grid-cols-2">
            {(shop ?? []).map((item) => {
              const Icon = itemIcon(item);
              const accent = planAccent(item);
              const name = language === "tr" ? item.name_tr : item.name_en;
              const description = language === "tr" ? item.description_tr : item.description_en;
              const isOwned = owned.has(item.sku);
              const affordable = balance >= item.price;

              return (
                <div
                  key={item.sku}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-3",
                    isOwned ? "border-primary/40 bg-primary/5" : "border-border/70",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        color: accent,
                        backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`,
                      }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">{name}</p>
                      <p className="text-[10.5px] tracking-wide text-muted-foreground uppercase">
                        {t(`economy.${item.kind}`)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums">
                      {item.price.toLocaleString(language)}
                    </span>
                  </div>

                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">{description}</p>

                  <Button
                    size="sm"
                    className="mt-auto h-7"
                    variant={isOwned ? "outline" : affordable ? "default" : "ghost"}
                    disabled={isOwned || !affordable || purchase.isPending}
                    onClick={() => buy(item)}
                  >
                    {isOwned
                      ? t("economy.owned")
                      : affordable
                        ? t("economy.buy")
                        : t("economy.notEnough")}
                  </Button>
                </div>
              );
            })}
          </div>

          {(economy?.history ?? []).length > 0 ? (
            <div className="border-t border-border/60 px-5 py-3">
              <p className="mb-1.5 text-[11.5px] font-semibold">{t("economy.history")}</p>
              <div className="space-y-0.5">
                {(economy?.history ?? []).slice(0, 8).map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[11.5px] text-muted-foreground"
                  >
                    <span className="truncate">{entry.reason}</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        entry.amount > 0 ? "text-status-online" : "text-foreground",
                      )}
                    >
                      {entry.amount > 0 ? "+" : ""}
                      {entry.amount}
                    </span>
                    <span className="ml-2 shrink-0 text-[10.5px]">
                      {relativeTime(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
