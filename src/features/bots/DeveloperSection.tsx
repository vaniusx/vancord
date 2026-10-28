import { Check, Copy, Loader2, Plus, RefreshCw, Terminal, Trash2, X } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ALL_DISPLAY_PERMISSIONS,
  notifyResult,
  useBotActions,
  useBotErrorMessage,
  useMyBots,
  type BotPermission,
  type BotRow,
} from "@/features/bots/use-bots";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  testing: "bg-status-idle/15 text-status-idle",
  pending_review: "bg-status-idle/15 text-status-idle",
  approved: "bg-status-online/15 text-status-online",
  rejected: "bg-destructive/15 text-destructive",
  suspended: "bg-destructive/15 text-destructive",
};

function PermissionPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (permission: BotPermission) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {ALL_DISPLAY_PERMISSIONS.map((permission) => {
        const active = selected.includes(permission);
        const risky = permission === "members.moderate" || permission === "channels.manage";
        return (
          <button
            key={permission}
            type="button"
            onClick={() => onToggle(permission)}
            className={cn(
              "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
              active
                ? "border-primary bg-primary/8"
                : "border-border hover:bg-accent/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {active ? <Check className="size-3" /> : null}
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[11px] font-medium">{permission}</span>
              <span className="block text-[10.5px] text-muted-foreground">
                {t(`bots.permissions.${permission}`)}
                {risky ? ` · ${t("bots.risky")}` : ""}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function BotCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (token: string) => void;
}) {
  const { t } = useTranslation();
  const { createBot } = useBotActions();
  const describeError = useBotErrorMessage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [webhook, setWebhook] = useState("");
  const [permissions, setPermissions] = useState<string[]>([
    "messages.read",
    "messages.write",
    "channels.read",
    "members.read",
  ]);

  const toggle = (permission: BotPermission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  };

  const submit = () => {
    createBot.mutate(
      { name, description, webhook: webhook.trim(), permissions },
      {
        onSuccess: (result) => {
          onOpenChange(false);
          setName("");
          setDescription("");
          setWebhook("");
          onCreated(result.token);
        },
        onError: (error) => toast.error(describeError(error)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("bots.createTitle")}</DialogTitle>
          <DialogDescription>{t("bots.createBody")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bot-name">{t("bots.name")}</Label>
            <Input
              id="bot-name"
              value={name}
              maxLength={32}
              placeholder="Guardian"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bot-webhook">{t("bots.webhook")}</Label>
            <Input
              id="bot-webhook"
              value={webhook}
              placeholder="https://bot.example.com/vancord"
              onChange={(event) => setWebhook(event.target.value)}
              className="font-mono text-[12px]"
            />
            <p className="text-[11px] text-muted-foreground">{t("bots.webhookHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bot-desc">{t("bots.description")}</Label>
            <Textarea
              id="bot-desc"
              value={description}
              rows={2}
              maxLength={280}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("bots.permissions.title")}</Label>
            <PermissionPicker selected={permissions} onToggle={toggle} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={
              createBot.isPending ||
              name.trim().length < 2 ||
              !webhook.trim().startsWith("https://") ||
              permissions.length === 0
            }
          >
            {createBot.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t("bots.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TokenDialog({
  token,
  open,
  onOpenChange,
}: {
  token: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("bots.tokenTitle")}</DialogTitle>
          <DialogDescription>{t("bots.tokenOnce")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 p-2.5">
          <code className="min-w-0 flex-1 truncate font-mono text-[11.5px]">{token}</code>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={async () => {
              if (!token) return;
              await navigator.clipboard.writeText(token);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        </div>

        <div className="rounded-lg bg-accent/50 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{t("bots.quickstart")}</p>
          <pre className="mt-1.5 overflow-x-auto font-mono text-[10.5px]">{`VANCORD_BOT_TOKEN=${token ?? "vc_..."}
node examples/ping.js`}</pre>
        </div>

        <Button onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
      </DialogContent>
    </Dialog>
  );
}

function BotCard({
  bot,
  onToken,
}: {
  bot: BotRow;
  onToken: (token: string) => void;
}) {
  const { t } = useTranslation();
  const { testBot, rotateToken, deleteBot } = useBotActions();
  const [checks, setChecks] = useState<
    Array<{ id: string; label: string; passed: boolean; detail: string }>
  >([]);
  const [open, setOpen] = useState(false);

  const run = () => {
    testBot.mutate(bot.id, {
      onSuccess: (result) => {
        setChecks(result.checks ?? []);
        setOpen(true);
        notifyResult(result.passed, result.score);
      },
      onError: () => toast.error(t("common.error")),
    });
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-3">
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Terminal className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13.5px] font-semibold">{bot.name}</p>
            <span
              className={cn(
                "rounded px-1.5 py-px text-[9.5px] font-bold uppercase",
                STATUS_STYLE[bot.status] ?? STATUS_STYLE.draft,
              )}
            >
              {t(`bots.status.${bot.status}`)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t("bots.tier", { tier: bot.risk_tier })}
            </span>
          </div>
          {bot.description ? (
            <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
              {bot.description}
            </p>
          ) : null}
          <p className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">
            {bot.webhook_url}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {bot.permissions.map((permission) => (
              <span
                key={permission}
                className="rounded bg-accent px-1.5 py-px font-mono text-[9.5px]"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <Button size="sm" className="h-7 text-[11.5px]" onClick={run} disabled={testBot.isPending}>
          {testBot.isPending ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 size-3.5" />
          )}
          {t("bots.runTest")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11.5px]"
          onClick={() => {
            rotateToken.mutate(bot.id, {
              onSuccess: (token) => onToken(token),
              onError: () => toast.error(t("common.error")),
            });
          }}
        >
          <RefreshCw className="mr-1.5 size-3.5" />
          {t("bots.rotate")}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto size-7 text-muted-foreground hover:text-destructive"
          onClick={() => {
            deleteBot.mutate(bot.id, {
              onSuccess: () => toast.success(t("bots.deleted")),
            });
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {open && checks.length > 0 ? (
        <div className="mt-2.5 space-y-1 rounded-lg bg-background/70 p-2.5 dark:bg-black/25">
          {checks.map((check) => (
            <div key={check.id} className="flex items-start gap-1.5 text-[11px]">
              {check.passed ? (
                <Check className="mt-0.5 size-3 shrink-0 text-status-online" />
              ) : (
                <X className="mt-0.5 size-3 shrink-0 text-destructive" />
              )}
              <span className="flex-1">{check.label}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {check.detail}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DeveloperSection() {
  const { t } = useTranslation();
  const { data: bots, isLoading } = useMyBots();
  const [creating, setCreating] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">{t("bots.title")}</p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {t("bots.subtitle")}
          </p>
        </div>
        <Button size="sm" className="h-8 shrink-0" onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 size-3.5" />
          {t("bots.new")}
        </Button>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {t("common.loading")}
        </div>
      ) : (bots ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5 text-center">
          <p className="text-[13px] font-medium">{t("bots.emptyTitle")}</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">{t("bots.emptyBody")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bots?.map((bot) => (
            <BotCard key={bot.id} bot={bot} onToken={setToken} />
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t("bots.docsHint")}
      </p>

      <BotCreateDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(value) => setToken(value)}
      />
      <TokenDialog token={token} open={Boolean(token)} onOpenChange={(open) => !open && setToken(null)} />
    </div>
  );
}
