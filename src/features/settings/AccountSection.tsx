import { KeyRound, Loader2, LogOut, Mail, Monitor, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useProfile } from "@/features/profiles/use-profile";
import { requireSupabase } from "@/lib/supabase";
import { explainError } from "@/lib/errors";

interface SessionInfo {
  id: string;
  created_at: string;
  updated_at: string;
  user_agent: string | null;
  ip: string | null;
}

function SessionRow({ session, current }: { session: SessionInfo; current: boolean }) {
  const { t } = useTranslation();
  const device = (() => {
    const agent = session.user_agent ?? "";
    if (/android/i.test(agent)) return t("account.deviceAndroid");
    if (/iphone|ipad/i.test(agent)) return t("account.deviceIos");
    if (/windows/i.test(agent)) return t("account.deviceWindows");
    if (/mac os/i.test(agent)) return t("account.deviceMac");
    if (/linux/i.test(agent)) return t("account.deviceLinux");
    return t("account.deviceUnknown");
  })();

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/70 px-2.5 py-2">
      <Monitor className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium">
          {device}
          {current ? (
            <span className="ml-1.5 rounded bg-primary/12 px-1 py-px text-[10px] text-primary">
              {t("account.thisDevice")}
            </span>
          ) : null}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {new Date(session.updated_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

/** Account, password, sessions and deletion. */
export function AccountSection() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { data: profile } = useProfile();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"password" | "sessions" | "delete" | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [confirmDelete, setConfirmDelete] = useState("");

  const loadSessions = async () => {
    try {
      const supabase = requireSupabase();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      // The sessions endpoint is not in supabase-js, so call it directly.
      const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user/sessions`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      if (!response.ok) return;
      const list = (await response.json()) as SessionInfo[];
      setSessions(Array.isArray(list) ? list : []);
    } catch {
      setSessions([]);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const changePassword = async () => {
    if (password.length < 8) {
      toast.error(t("account.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("account.passwordMismatch"));
      return;
    }
    setBusy("password");
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      toast.success(t("account.passwordChanged"));
    } catch (error) {
      toast.error(t(explainError(error).message));
    } finally {
      setBusy(null);
    }
  };

  const signOutEverywhere = async () => {
    setBusy("sessions");
    try {
      const supabase = requireSupabase();
      await supabase.auth.signOut({ scope: "global" });
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async () => {
    if (confirmDelete !== (profile?.username ?? "")) {
      toast.error(t("account.typeUsername"));
      return;
    }
    setBusy("delete");
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc("delete_own_account");
      if (error) throw error;
      await supabase.auth.signOut();
    } catch {
      toast.error(t("account.deleteUnavailable"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Mail className="size-3.5" />
          {t("account.email")}
        </Label>
        <div className="flex items-center gap-2">
          <Input value={user?.email ?? ""} readOnly className="h-9" />
        </div>
        <p className="text-[11px] text-muted-foreground">{t("account.emailHint")}</p>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <Label className="flex items-center gap-1.5">
          <KeyRound className="size-3.5" />
          {t("account.changePassword")}
        </Label>
        <Input
          type="password"
          value={password}
          placeholder={t("account.newPassword")}
          onChange={(event) => setPassword(event.target.value)}
          className="h-9"
        />
        <Input
          type="password"
          value={confirm}
          placeholder={t("account.repeatPassword")}
          onChange={(event) => setConfirm(event.target.value)}
          className="h-9"
        />
        <Button
          size="sm"
          className="h-8"
          disabled={busy === "password" || !password || !confirm}
          onClick={() => void changePassword()}
        >
          {busy === "password" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
          {t("common.save")}
        </Button>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <Label>{t("account.sessions")}</Label>
        <div className="space-y-1">
          {sessions.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground">{t("account.sessionsEmpty")}</p>
          ) : (
            sessions
              .slice(0, 5)
              .map((session, index) => (
                <SessionRow key={session.id} session={session} current={index === 0} />
              ))
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={busy === "sessions"}
          onClick={() => void signOutEverywhere()}
        >
          <LogOut className="mr-1.5 size-3.5" />
          {t("account.signOutAll")}
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
        <Label className="flex items-center gap-1.5 text-destructive">
          <ShieldAlert className="size-3.5" />
          {t("account.deleteTitle")}
        </Label>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          {t("account.deleteBody")}
        </p>
        <Input
          value={confirmDelete}
          placeholder={profile?.username ?? ""}
          onChange={(event) => setConfirmDelete(event.target.value)}
          className="h-8"
        />
        <Button
          size="sm"
          variant="destructive"
          className="h-8"
          disabled={busy === "delete" || !confirmDelete}
          onClick={() => void deleteAccount()}
        >
          {busy === "delete" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
          {t("account.deleteAction")}
        </Button>
      </div>
    </div>
  );
}
