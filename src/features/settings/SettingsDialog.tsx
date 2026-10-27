import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Monitor, Moon, Sun, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/features/app/app-store";
import { useThemeStore, type ThemeMode } from "@/app/theme";
import { useProfile, useUpdateProfile } from "@/features/profiles/use-profile";
import { requestNotificationPermission } from "@/features/realtime/realtime";
import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/i18n";
import { publicUrl } from "@/lib/supabase";
import { uploadAvatar } from "@/lib/upload";
import { checkForUpdate } from "@/lib/updater";
import { cn } from "@/lib/utils";

function ProfileSection() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setCustomStatus(profile.custom_status ?? "");
    }
  }, [profile?.id, profile?.display_name, profile?.custom_status]);

  if (!profile) return null;

  const save = () => {
    updateProfile.mutate(
      {
        display_name: displayName.trim() || profile.display_name,
        custom_status: customStatus.trim() || null,
      },
      {
        onSuccess: () => toast.success(t("common.saved")),
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadAvatar(profile.id, file);
      updateProfile.mutate(
        { avatar_url: publicUrl("avatars", path) },
        { onSuccess: () => toast.success(t("settings.profile.avatarUpdated")) },
      );
    } catch {
      toast.error(t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar
          profile={{
            ...profile,
            avatar_url: profile.avatar_url,
          }}
          size="xl"
        />
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold">{t("settings.profile.avatar")}</p>
          <p className="text-[11.5px] text-muted-foreground">
            {t("settings.profile.avatarHint")}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <Upload className="mr-2 size-3.5" />
            )}
            {t("settings.profile.upload")}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">{t("auth.displayName")}</Label>
          <Input
            id="profile-name"
            value={displayName}
            maxLength={64}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("auth.username")}</Label>
          <Input value={`@${profile.username}`} readOnly className="opacity-60" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="profile-status">{t("settings.profile.customStatus")}</Label>
        <Input
          id="profile-status"
          value={customStatus}
          maxLength={128}
          placeholder={t("settings.profile.customStatusPlaceholder")}
          onChange={(event) => setCustomStatus(event.target.value)}
        />
      </div>

      <Button onClick={save} disabled={updateProfile.isPending}>
        {updateProfile.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : null}
        {t("common.save")}
      </Button>
    </div>
  );
}

function AppearanceSection() {
  const { t } = useTranslation();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  const options: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
    { value: "system", label: t("settings.appearance.system"), icon: <Monitor className="size-4" /> },
    { value: "dark", label: t("settings.appearance.dark"), icon: <Moon className="size-4" /> },
    { value: "light", label: t("settings.appearance.light"), icon: <Sun className="size-4" /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] font-semibold">{t("settings.appearance.theme")}</p>
        <p className="text-[11.5px] text-muted-foreground">
          {t("settings.appearance.themeHint")}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-[12px] transition-colors",
              mode === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-border hover:bg-accent/40",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationsSection() {
  const { t } = useTranslation();
  const enabled = useAppStore((state) => state.notificationsEnabled);
  const setEnabled = useAppStore((state) => state.setNotificationsEnabled);
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    void import("@tauri-apps/plugin-notification")
      .then((mod) => mod.isPermissionGranted())
      .then(setGranted)
      .catch(() => setGranted(null));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
        <div className="space-y-1">
          <p className="text-[13px] font-semibold">
            {t("settings.notifications.desktop")}
          </p>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            {t("settings.notifications.desktopHint")}
          </p>
          {granted === false ? (
            <p className="text-[11px] text-status-idle">
              {t("settings.notifications.permissionOff")}
            </p>
          ) : null}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={async (value) => {
            setEnabled(value);
            if (value) {
              const result = await requestNotificationPermission();
              setGranted(result);
            }
          }}
        />
      </div>
      <p className="text-[11.5px] text-muted-foreground">
        {t("settings.notifications.hint")}
      </p>
    </div>
  );
}

function LanguageSection() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  return (
    <div className="space-y-3">
      <p className="text-[13px] font-semibold">{t("settings.language.label")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["tr", "en"] as const).map((language) => (
          <button
            key={language}
            type="button"
            onClick={() => {
              void i18n.changeLanguage(language);
              void queryClient.invalidateQueries();
              toast.success(t("common.saved"));
            }}
            className={cn(
              "rounded-xl border px-4 py-3 text-left text-[13px] transition-colors",
              i18n.language === language
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent/40",
            )}
          >
            {t(`settings.language.${language}`)}
            {language === DEFAULT_LANGUAGE ? (
              <span className="ml-2 text-[10px] text-muted-foreground">
                {t("settings.language.default")}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {!isLanguage(i18n.language) ? (
        <p className="text-[11px] text-muted-foreground">
          {t("settings.language.fallback")}
        </p>
      ) : null}
    </div>
  );
}

function AboutSection() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    const info = await checkForUpdate();
    setChecking(false);
    setResult(info ? t("settings.about.updateAvailable", { version: info.version }) : t("settings.about.upToDate"));
  };

  return (
    <div className="space-y-3 text-[13px]">
      <div className="flex items-center gap-3">
        <div className="brand-gradient flex size-11 items-center justify-center rounded-xl text-lg font-bold text-white">
          V
        </div>
        <div>
          <p className="font-semibold">Vancord</p>
          <p className="text-[11.5px] text-muted-foreground">
            {t("settings.about.version")} 0.1.0
          </p>
        </div>
      </div>
      <p className="leading-relaxed text-muted-foreground">
        {t("settings.about.body")}
      </p>
      <div className="rounded-xl border border-border/70 bg-card/50 p-3 text-[11.5px] text-muted-foreground">
        <p>{t("settings.about.stack")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => void check()} disabled={checking}>
          {checking ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
          {t("settings.about.checkUpdates")}
        </Button>
        {result ? <span className="text-[11.5px] text-muted-foreground">{result}</span> : null}
      </div>
    </div>
  );
}

export function SettingsDialog() {
  const { t } = useTranslation();
  const open = useAppStore((state) => state.settingsOpen);
  const section = useAppStore((state) => state.settingsSection);
  const close = useAppStore((state) => state.closeSettings);
  const openSettings = useAppStore((state) => state.openSettings);

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : close())}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("settings.title")}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={section}
          onValueChange={(value) => openSettings(value as typeof section)}
          className="flex min-h-0 flex-col"
        >
          <div className="border-b border-border px-4 pt-3">
            <TabsList className="flex w-full justify-start gap-1 bg-transparent p-0">
              {(
                [
                  "profile",
                  "appearance",
                  "notifications",
                  "language",
                  "about",
                ] as const
              ).map((value) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-lg px-3 py-1.5 text-[12.5px] data-[state=active]:bg-accent"
                >
                  {t(`settings.sections.${value}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="scrollbar-thin max-h-[62vh] overflow-y-auto p-6">
            <TabsContent value="profile" className="m-0">
              <ProfileSection />
            </TabsContent>
            <TabsContent value="appearance" className="m-0">
              <AppearanceSection />
            </TabsContent>
            <TabsContent value="notifications" className="m-0">
              <NotificationsSection />
            </TabsContent>
            <TabsContent value="language" className="m-0">
              <LanguageSection />
            </TabsContent>
            <TabsContent value="about" className="m-0">
              <AboutSection />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
