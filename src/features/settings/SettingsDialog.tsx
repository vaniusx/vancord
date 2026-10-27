import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Monitor, Moon, Palette, Sun, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { THEME_OPTIONS, useIsDark, useThemeStore, type ThemeMode } from "@/app/theme";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/features/app/app-store";
import { useProfile, useUpdateProfile } from "@/features/profiles/use-profile";
import { requestNotificationPermission } from "@/features/realtime/realtime";
import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/i18n";
import { publicUrl } from "@/lib/supabase";
import { uploadAvatar, uploadBanner } from "@/lib/upload";
import { checkForUpdate } from "@/lib/updater";
import { cn } from "@/lib/utils";

const BANNER_COLORS = [
  "#1F5F52",
  "#2F4A6D",
  "#4B5B3F",
  "#A15430",
  "#8C4362",
  "#17605C",
  "#3F3F46",
  "#7A5B2F",
];

function ProfileSection() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [bio, setBio] = useState("");
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0]);
  const [busy, setBusy] = useState<"avatar" | "banner" | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setCustomStatus(profile.custom_status ?? "");
    setBio(profile.bio ?? "");
    setBannerColor(profile.banner_color ?? BANNER_COLORS[0]);
  }, [profile?.id, profile?.display_name, profile?.custom_status, profile?.bio, profile?.banner_color]);

  if (!profile) return null;

  const save = () => {
    updateProfile.mutate(
      {
        display_name: displayName.trim() || profile.display_name,
        custom_status: customStatus.trim() || null,
        bio: bio.trim() || null,
        banner_color: bannerColor,
      },
      {
        onSuccess: () => toast.success(t("common.saved")),
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    setBusy("avatar");
    try {
      const path = await uploadAvatar(profile.id, file);
      updateProfile.mutate(
        { avatar_url: publicUrl("avatars", path) },
        { onSuccess: () => toast.success(t("settings.profile.avatarUpdated")) },
      );
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(null);
    }
  };

  const onBanner = async (file: File | undefined) => {
    if (!file) return;
    setBusy("banner");
    try {
      const path = await uploadBanner(profile.id, file);
      updateProfile.mutate(
        { banner_url: publicUrl("banners", path) },
        { onSuccess: () => toast.success(t("settings.profile.bannerUpdated")) },
      );
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-border/70">
        <button
          type="button"
          onClick={() => bannerRef.current?.click()}
          className="relative flex h-24 w-full items-end justify-end p-2 transition-opacity hover:opacity-90"
          style={
            profile.banner_url
              ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { backgroundColor: bannerColor }
          }
        >
          <span className="flex items-center gap-1.5 rounded-md bg-black/35 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            {busy === "banner" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Upload className="size-3" />
            )}
            {t("settings.profile.changeBanner")}
          </span>
        </button>
        <div className="flex items-end gap-3 px-3 pb-3">
          <div className="-mt-6">
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="group relative block"
            >
              <Avatar profile={profile} size="xl" className="ring-4 ring-card" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                {busy === "avatar" ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : (
                  <Upload className="size-5 text-white" />
                )}
              </span>
            </button>
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="truncate text-[14px] font-semibold">{profile.display_name}</p>
            <p className="truncate text-[12px] text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
      </div>

      <input
        ref={avatarRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void onAvatar(event.target.files?.[0])}
      />
      <input
        ref={bannerRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => void onBanner(event.target.files?.[0])}
      />

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Palette className="size-3.5 text-muted-foreground" />
          {t("settings.profile.bannerColor")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {BANNER_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setBannerColor(color)}
              aria-label={color}
              className={cn(
                "size-7 rounded-full transition-transform",
                bannerColor === color && !profile.banner_url
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "hover:scale-110",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

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

      <div className="space-y-1.5">
        <Label htmlFor="profile-bio">{t("settings.profile.bio")}</Label>
        <Textarea
          id="profile-bio"
          value={bio}
          maxLength={280}
          rows={3}
          placeholder={t("settings.profile.bioPlaceholder")}
          onChange={(event) => setBio(event.target.value)}
        />
        <p className="text-right text-[11px] text-muted-foreground tabular-nums">
          {bio.length}/280
        </p>
      </div>

      <Button onClick={save} disabled={updateProfile.isPending}>
        {updateProfile.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {t("common.save")}
      </Button>
    </div>
  );
}

function AppearanceSection() {
  const { t } = useTranslation();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const themeId = useThemeStore((state) => state.themeId);
  const setThemeId = useThemeStore((state) => state.setThemeId);
  const dark = useIsDark();

  const options: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
    { value: "system", label: t("settings.appearance.system"), icon: <Monitor className="size-4" /> },
    { value: "dark", label: t("settings.appearance.dark"), icon: <Moon className="size-4" /> },
    { value: "light", label: t("settings.appearance.light"), icon: <Sun className="size-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <p className="text-[13px] font-semibold">{t("settings.appearance.theme")}</p>
          <p className="text-[12px] text-muted-foreground">
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
                "flex flex-col items-center gap-2 rounded-xl border p-3.5 text-[12.5px] transition-colors",
                mode === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent/50",
              )}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[13px] font-semibold">{t("settings.appearance.palette")}</p>
          <p className="text-[12px] text-muted-foreground">
            {t("settings.appearance.paletteHint")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEME_OPTIONS.map((theme) => {
            const active = themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setThemeId(theme.id)}
                aria-pressed={active}
                className={cn(
                  "overflow-hidden rounded-xl border text-left transition-colors",
                  active
                    ? "border-primary ring-1 ring-primary/40"
                    : "border-border hover:border-muted-foreground/40",
                )}
              >
                <span
                  className="flex h-14 items-end justify-between p-2"
                  style={{ backgroundColor: dark ? "#1F2124" : theme.tint }}
                >
                  <span className="flex gap-1">
                    <span
                      className="size-4 rounded-[5px]"
                      style={{ backgroundColor: theme.swatch }}
                    />
                    <span
                      className="size-4 rounded-[5px] opacity-40"
                      style={{ backgroundColor: theme.swatch }}
                    />
                  </span>
                  {active ? <Check className="size-3.5 text-primary" /> : null}
                </span>
                <span className="block px-2.5 py-2 text-[12.5px] font-medium">
                  {t(theme.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
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
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {t("settings.notifications.desktopHint")}
          </p>
          {granted === false ? (
            <p className="text-[11.5px] text-status-idle">
              {t("settings.notifications.permissionOff")}
            </p>
          ) : null}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={async (value) => {
            setEnabled(value);
            if (value) setGranted(await requestNotificationPermission());
          }}
        />
      </div>
      <p className="text-[12px] text-muted-foreground">
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
              <span className="ml-2 text-[10.5px] text-muted-foreground">
                {t("settings.language.default")}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {!isLanguage(i18n.language) ? (
        <p className="text-[11.5px] text-muted-foreground">
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
    setResult(
      info
        ? t("settings.about.updateAvailable", { version: info.version })
        : t("settings.about.upToDate"),
    );
  };

  return (
    <div className="space-y-3 text-[13px]">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
          V
        </div>
        <div>
          <p className="font-semibold">Vancord</p>
          <p className="text-[12px] text-muted-foreground">
            {t("settings.about.version")} 0.2.0
          </p>
        </div>
      </div>
      <p className="leading-relaxed text-muted-foreground">{t("settings.about.body")}</p>
      <div className="rounded-xl border border-border/70 bg-card/50 p-3 text-[12px] text-muted-foreground">
        <p>{t("settings.about.stack")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => void check()} disabled={checking}>
          {checking ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
          {t("settings.about.checkUpdates")}
        </Button>
        {result ? <span className="text-[12px] text-muted-foreground">{result}</span> : null}
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
          <DialogDescription className="sr-only">{t("settings.title")}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={section}
          onValueChange={(value) => openSettings(value as typeof section)}
          className="flex min-h-0 flex-col"
        >
          <div className="border-b border-border px-4 pt-3">
            <TabsList className="flex w-full justify-start gap-1 bg-transparent p-0">
              {(
                ["profile", "appearance", "notifications", "language", "about"] as const
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
