import { Check, Loader2, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INVITE_HOST } from "@/lib/invites";
import { requireSupabase } from "@/lib/supabase";

/**
 * Vanity URL editor.
 *
 * A custom address is a boost perk: it costs a level 2 server (seven boosts) and
 * is checked server side, so hiding the control here is only a courtesy — the
 * RPC is what actually enforces the rule.
 */
export function VanitySlugEditor({
  serverId,
  slug,
  canUse,
  onSaved,
}: {
  serverId: string;
  slug: string | null;
  canUse: boolean;
  onSaved: (next: string | null) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(slug ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(slug ?? "");
  }, [slug]);

  const save = async () => {
    setSaving(true);
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("set_vanity_slug", {
        target_server: serverId,
        slug: value.trim(),
      });
      if (error) throw error;
      const next = (data as string | null) ?? null;
      onSaved(next);
      setSaved(true);
      toast.success(t("vanity.saved"));
      setTimeout(() => setSaved(false), 1600);
    } catch (error) {
      const raw = String(error);
      if (raw.includes("vanity_requires_boost")) toast.error(t("vanity.needsBoost"));
      else if (raw.includes("slug_taken")) toast.error(t("vanity.taken"));
      else if (raw.includes("invalid_slug")) toast.error(t("vanity.invalid"));
      else toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5 rounded-xl border border-border/70 p-3">
      <div className="flex items-center gap-2">
        <Link2 className="size-3.5 text-primary" />
        <Label htmlFor="vanity-slug" className="text-[12.5px]">
          {t("vanity.title")}
        </Label>
      </div>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {canUse ? t("vanity.body") : t("vanity.locked")}
      </p>

      <div className="flex items-center gap-1.5">
        <span className="shrink-0 rounded-md bg-secondary px-2 py-1.5 text-[11.5px] text-muted-foreground">
          {INVITE_HOST}/
        </span>
        <Input
          id="vanity-slug"
          value={value}
          disabled={!canUse}
          maxLength={32}
          placeholder="vanius"
          onChange={(event) =>
            setValue(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
          }
          className="h-9"
        />
        <Button
          size="sm"
          className="h-9 shrink-0"
          disabled={!canUse || saving || value === (slug ?? "")}
          onClick={() => void save()}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : saved ? (
            <Check className="size-3.5" />
          ) : (
            t("common.save")
          )}
        </Button>
      </div>
    </div>
  );
}
