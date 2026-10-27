import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AtSign, Eye, EyeOff, Lock, User } from "lucide-react";

import { useAuthStatus } from "@/features/auth/auth-store";
import { useAuthErrorMessage } from "@/features/auth/use-auth-error";
import {
  signInSchema,
  signUpSchema,
  type SignInValues,
  type SignUpValues,
} from "@/features/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";

type FieldErrors = Partial<Record<string, string>>;

function useSupabaseGuard() {
  const { t } = useTranslation();
  useEffect(() => {
    if (!supabase) toast.error(t("auth.errors.notConfigured"));
  }, [t]);
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="px-9"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function SignInForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const describeError = useAuthErrorMessage();
  const [values, setValues] = useState<SignInValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = t(issue.message);
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setPending(false);

    if (error) {
      toast.error(describeError(error));
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="signin-email">{t("auth.email")}</Label>
        <div className="relative">
          <AtSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            className="pl-9"
            value={values.email}
            onChange={(event) =>
              setValues((current) => ({ ...current, email: event.target.value }))
            }
            aria-invalid={Boolean(errors.email)}
          />
        </div>
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signin-password">{t("auth.password")}</Label>
        <PasswordInput
          id="signin-password"
          value={values.password}
          onChange={(password) =>
            setValues((current) => ({ ...current, password }))
          }
          autoComplete="current-password"
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("common.loading") : t("auth.signIn")}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const { t } = useTranslation();
  const describeError = useAuthErrorMessage();
  const [values, setValues] = useState<SignUpValues>({
    email: "",
    username: "",
    displayName: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = t(issue.message);
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          username: parsed.data.username.toLowerCase(),
          display_name: parsed.data.displayName,
        },
      },
    });
    setPending(false);

    if (error) {
      toast.error(describeError(error));
      return;
    }

    if (!data.session) {
      setSentTo(parsed.data.email);
      return;
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card/60 p-4 text-sm">
        <p className="font-medium">{t("auth.confirmTitle")}</p>
        <p className="text-muted-foreground">
          {t("auth.confirmBody", { email: sentTo })}
        </p>
        <Button variant="outline" onClick={() => setSentTo(null)}>
          {t("auth.backToSignIn")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="signup-email">{t("auth.email")}</Label>
        <div className="relative">
          <AtSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            className="pl-9"
            value={values.email}
            onChange={(event) =>
              setValues((current) => ({ ...current, email: event.target.value }))
            }
            aria-invalid={Boolean(errors.email)}
          />
        </div>
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="signup-username">{t("auth.username")}</Label>
          <div className="relative">
            <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-username"
              className="pl-9"
              autoComplete="username"
              value={values.username}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              aria-invalid={Boolean(errors.username)}
            />
          </div>
          {errors.username ? (
            <p className="text-xs text-destructive">{errors.username}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {t("auth.usernameHint")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-name">{t("auth.displayName")}</Label>
          <Input
            id="signup-name"
            autoComplete="name"
            value={values.displayName}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                displayName: event.target.value,
              }))
            }
            aria-invalid={Boolean(errors.displayName)}
          />
          {errors.displayName ? (
            <p className="text-xs text-destructive">{errors.displayName}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-password">{t("auth.password")}</Label>
        <PasswordInput
          id="signup-password"
          value={values.password}
          onChange={(password) =>
            setValues((current) => ({ ...current, password }))
          }
          autoComplete="new-password"
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {t("auth.passwordHint")}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("common.loading") : t("auth.signUp")}
      </Button>
    </form>
  );
}

export function AuthPage() {
  const { t } = useTranslation();
  const status = useAuthStatus();
  useSupabaseGuard();

  if (status === "authenticated") return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="brand-gradient absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_55%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-lg font-bold backdrop-blur">
            V
          </div>
          <span className="text-lg font-semibold tracking-tight">
            {t("app.name")}
          </span>
        </div>
        <div className="relative max-w-md space-y-3">
          <h1 className="text-3xl leading-tight font-bold">{t("auth.heroTitle")}</h1>
          <p className="text-white/80">{t("auth.heroBody")}</p>
        </div>
        <p className="relative text-xs text-white/60">{t("app.tagline")}</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-[480px]">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("auth.welcome")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-4">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="pt-4">
              <SignUpForm />
            </TabsContent>
          </Tabs>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            {t("auth.terms")}
          </p>
        </div>
      </div>
    </div>
  );
}
