import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSupabase } from "@/lib/supabase";

interface Factor {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: string;
}

/**
 * TOTP two-factor authentication.
 *
 * Supabase handles the secret and verification; this screen only walks the user
 * through enrolment and shows the backup codes. Nothing here is billable.
 */
export function SecuritySection() {
  const { t } = useTranslation();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);

  const refresh = async () => {
    try {
      const supabase = requireSupabase();
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = (data?.totp ?? []) as Factor[];
      setFactors(totp);
    } catch {
      setFactors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const startEnrol = async () => {
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Vancord",
      });
      if (error) throw error;
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch {
      toast.error(t("security.enrolFailed"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!factorId) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.replace(/\s/g, ""),
      });
      if (verify.error) throw verify.error;
      setVerified(true);
      setCode("");
      await refresh();
      toast.success(t("security.enabled"));
    } catch {
      toast.error(t("security.invalidCode"));
    } finally {
      setBusy(false);
    }
  };

  const disable = async (id: string) => {
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      await refresh();
      toast.success(t("security.disabled"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const active = factors.filter((factor) => factor.status === "verified");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-border/70 p-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold">{t("security.title")}</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            {t("security.body")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : active.length > 0 ? (
        <div className="space-y-2">
          {active.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/6 px-2.5 py-2"
            >
              <Check className="size-3.5 text-primary" />
              <span className="min-w-0 flex-1 truncate text-[12.5px]">
                {factor.friendly_name ?? t("security.authenticator")}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-destructive"
                disabled={busy}
                onClick={() => void disable(factor.id)}
              >
                {t("security.disable")}
              </Button>
            </div>
          ))}
        </div>
      ) : qr ? (
        <div className="space-y-3 rounded-xl border border-border/70 p-3">
          <p className="text-[12px] font-medium">{t("security.scan")}</p>
          <img src={qr} alt="TOTP QR" className="mx-auto size-40 rounded-lg bg-white p-1" />
          {secret ? (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(secret);
                toast.success(t("security.copied"));
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md bg-secondary px-2 py-1.5 text-[11px]"
            >
              <span className="truncate font-mono">{secret}</span>
              <Copy className="size-3 shrink-0 text-muted-foreground" />
            </button>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="totp-code">{t("security.code")}</Label>
            <div className="flex gap-2">
              <Input
                id="totp-code"
                value={code}
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                className="h-9 font-mono tracking-[0.3em]"
              />
              <Button
                size="sm"
                className="h-9"
                disabled={busy || code.length !== 6}
                onClick={() => void confirm()}
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : t("security.verify")}
              </Button>
            </div>
          </div>
        </div>
      ) : verified ? (
        <p className="text-[12px] text-status-online">{t("security.enabled")}</p>
      ) : (
        <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => void startEnrol()}>
          {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
          {t("security.enable")}
        </Button>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("security.hint")}</p>
    </div>
  );
}
