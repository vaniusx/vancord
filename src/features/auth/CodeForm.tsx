import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAuthErrorMessage } from "@/features/auth/use-auth-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

type Purpose = "signup" | "recovery";

function useCountdown(active: boolean) {
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (!active) return;
    setSeconds(RESEND_SECONDS);
    const timer = setInterval(() => {
      setSeconds((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  return [seconds, setSeconds] as const;
}

export function CodeForm({
  email,
  purpose,
  onVerified,
  onChangeEmail,
}: {
  email: string;
  purpose: Purpose;
  onVerified?: () => void;
  onChangeEmail: () => void;
}) {
  const { t } = useTranslation();
  const describeError = useAuthErrorMessage();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [creatingPassword, setCreatingPassword] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [seconds, setSeconds] = useCountdown(true);

  const code = digits.join("");

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      return;
    }

    setDigits((current) => {
      const next = [...current];
      if (clean.length > 1) {
        clean
          .slice(0, CODE_LENGTH - index)
          .split("")
          .forEach((char, offset) => {
            next[index + offset] = char;
          });
        const focusIndex = Math.min(index + clean.length, CODE_LENGTH - 1);
        requestAnimationFrame(() => inputs.current[focusIndex]?.focus());
      } else {
        next[index] = clean;
        if (index < CODE_LENGTH - 1) {
          requestAnimationFrame(() => inputs.current[index + 1]?.focus());
        }
      }
      return next;
    });
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const verify = async () => {
    if (!supabase || code.length !== CODE_LENGTH) return;
    setPending(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: purpose,
    });

    setPending(false);

    if (verifyError) {
      const message = describeError(verifyError);
      setError(message);
      toast.error(message);
      return;
    }

    if (purpose === "recovery") {
      setCreatingPassword(true);
      return;
    }

    onVerified?.();
  };

  const resend = async () => {
    if (!supabase) return;
    setSending(true);
    const { error: resendError } =
      purpose === "recovery"
        ? await supabase.auth.resetPasswordForEmail(email)
        : await supabase.auth.resend({ type: "signup", email });
    setSending(false);

    if (resendError) {
      toast.error(describeError(resendError));
      return;
    }

    setSeconds(RESEND_SECONDS);
    toast.success(t("auth.codeSent"));
  };

  const savePassword = async () => {
    if (!supabase) return;
    if (password.length < 8) {
      toast.error(t("auth.errors.passwordShort"));
      return;
    }
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      toast.error(describeError(updateError));
      return;
    }
    toast.success(t("auth.resetDone"));
    onVerified?.();
  };

  if (creatingPassword) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold">{t("auth.resetTitle")}</h3>
          <p className="text-[12.5px] text-muted-foreground">{t("auth.newPassword")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            autoFocus
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void savePassword();
            }}
          />
          <p className="text-[11.5px] text-muted-foreground">{t("auth.passwordHint")}</p>
        </div>
        <Button className="w-full" onClick={() => void savePassword()} disabled={pending}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {t("common.save")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <ShieldCheck className="size-4 text-primary" />
          {purpose === "recovery" ? t("auth.resetTitle") : t("auth.verifyTitle")}
        </h3>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          {t(purpose === "recovery" ? "auth.resetBody" : "auth.verifyBody", { email })}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>{t("auth.verifyCode")}</Label>
        <div className="flex gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              aria-label={`${t("auth.verifyCode")} ${index + 1}`}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => {
                event.preventDefault();
                setDigit(index, event.clipboardData.getData("text"));
              }}
              className={cn(
                "h-11 w-full rounded-lg border border-input bg-card text-center text-[17px] font-semibold tabular-nums transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none",
                error && "border-destructive",
              )}
            />
          ))}
        </div>
        {error ? <p className="text-[11.5px] text-destructive">{error}</p> : null}
      </div>

      <Button
        className="w-full"
        onClick={() => void verify()}
        disabled={pending || code.length !== CODE_LENGTH}
      >
        {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {t("auth.verify")}
      </Button>

      <div className="flex items-center justify-between text-[12px]">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={seconds > 0 || sending}
          className="text-primary transition-opacity hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {sending
            ? t("common.loading")
            : seconds > 0
              ? t("auth.resendIn", { seconds })
              : t("auth.resend")}
        </button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("auth.useOtherEmail")}
        </button>
      </div>
    </div>
  );
}
