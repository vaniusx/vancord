import { Loader2, PackageCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BrandMark } from "@/components/common/brand-mark";
import { useAppStore } from "@/features/app/app-store";
import {
  canAutoUpdate,
  checkForUpdateWithTimeout,
  downloadAndInstall,
  isStableVersion,
  isUpdateBlocked,
  relaunchApp,
  type UpdateProgress,
} from "@/lib/updater";

type GateState =
  | { status: "checking" }
  | { status: "ready" }
  | { status: "updating"; progress: UpdateProgress }
  | { status: "failed"; message: string; version: string | null };

function UpdateSplash({ progress }: { progress: UpdateProgress }) {
  const { t } = useTranslation();
  const percent =
    progress.total && progress.total > 0
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : null;

  const label =
    progress.phase === "installing"
      ? t("update.installing")
      : progress.phase === "downloading"
        ? t("update.downloading")
        : t("update.checking");

  return (
    <div className="stage flex h-[100dvh] w-screen flex-col items-center justify-center gap-6 p-8 text-foreground">
      <BrandMark size={56} />
      <div className="w-full max-w-[320px] space-y-3 text-center">
        <p className="text-[15px] font-semibold">{label}</p>
        <p className="text-[12.5px] text-muted-foreground">
          {progress.version ? `v${progress.version}` : t("common.loading")}
        </p>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label={t("update.progress")}
          aria-valuenow={percent ?? undefined}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: percent === null ? "35%" : `${percent}%` }}
          />
        </div>
        <p className="text-[11.5px] text-muted-foreground tabular-nums">
          {percent === null ? t("update.starting") : `${percent}%`}
        </p>
      </div>
    </div>
  );
}

function BootFallback() {
  const { t } = useTranslation();
  return (
    <div className="stage flex h-[100dvh] w-screen flex-col items-center justify-center gap-4 text-foreground">
      <BrandMark size={44} />
      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        {t("update.checking")}
      </div>
    </div>
  );
}

/**
 * Runs the update check before the router mounts. When an update is available
 * and automatic updates are enabled, the app never opens until it is installed.
 */
export function BootGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const autoUpdate = useAppStore((state) => state.autoUpdate);
  const setPendingUpdate = useAppStore((state) => state.setPendingUpdate);
  const [state, setState] = useState<GateState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    // Web builds, development and mobile have no updater: skip entirely.
    if (!canAutoUpdate() || import.meta.env.DEV) {
      setState({ status: "ready" });
      return;
    }

    void (async () => {
      const info = await checkForUpdateWithTimeout();
      if (cancelled) return;

      if (!info) {
        setState({ status: "ready" });
        return;
      }

      // Remember it so Settings can offer a manual install even when the
      // automatic path is disabled.
      setPendingUpdate({ version: info.version, notes: info.notes });

      if (!autoUpdate || !isStableVersion(info.version) || isUpdateBlocked(info.version)) {
        setState({ status: "ready" });
        return;
      }

      setState({
        status: "updating",
        progress: {
          phase: "downloading",
          downloaded: 0,
          total: null,
          version: info.version,
          message: null,
        },
      });

      const ok = await downloadAndInstall({
        onProgress: (progress) => {
          if (!cancelled) setState({ status: "updating", progress });
        },
      });

      if (cancelled) return;

      if (ok) {
        // The installer replaced the binary; restart into the new version.
        await relaunchApp();
        return;
      }

      setState({
        status: "failed",
        message: t("update.failed"),
        version: info.version,
      });
    })();

    return () => {
      cancelled = true;
    };
    // The decision is made once per launch on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "checking") return <BootFallback />;
  if (state.status === "updating") return <UpdateSplash progress={state.progress} />;

  if (state.status === "failed") {
    return (
      <div className="stage flex h-[100dvh] w-screen flex-col items-center justify-center gap-5 p-8 text-center text-foreground">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
          <TriangleAlert className="size-5" />
        </div>
        <div className="max-w-[320px] space-y-1.5">
          <p className="text-[15px] font-semibold">{t("update.failedTitle")}</p>
          <p className="text-[12.5px] text-muted-foreground">{state.message}</p>
          {state.version ? (
            <p className="text-[11.5px] text-muted-foreground">
              {t("update.availableVersion", { version: state.version })}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setState({ status: "ready" })}
            className="rounded-lg px-3 py-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            {t("update.continueWithout")}
          </button>
          <button
            type="button"
            onClick={() => {
              setState({
                status: "updating",
                progress: {
                  phase: "downloading",
                  downloaded: 0,
                  total: null,
                  version: state.version,
                  message: null,
                },
              });
              void downloadAndInstall({
                onProgress: (progress) => setState({ status: "updating", progress }),
              }).then(async (ok) => {
                if (ok) await relaunchApp();
                else setState({ status: "failed", message: t("update.failed"), version: state.version });
              });
            }}
            className="rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground"
          >
            {t("update.retry")}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Small banner shown inside the app when an update is waiting. */
export function UpdateNotice() {
  const { t } = useTranslation();
  const pending = useAppStore((state) => state.pendingUpdate);
  const setPending = useAppStore((state) => state.setPendingUpdate);
  const [busy, setBusy] = useState(false);

  if (!pending) return null;

  const install = async () => {
    setBusy(true);
    const ok = await downloadAndInstall();
    setBusy(false);
    if (ok) await relaunchApp();
  };

  return (
    <div className="mx-2 mb-2 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2 text-[12px]">
      <PackageCheck className="size-3.5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 truncate text-foreground">
        {t("update.availableVersion", { version: pending.version })}
      </p>
      <button
        type="button"
        onClick={() => void install()}
        disabled={busy}
        className="shrink-0 rounded-md bg-primary px-2 py-1 text-[11.5px] font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy ? t("update.installing") : t("update.installNow")}
      </button>
      <button
        type="button"
        onClick={() => setPending(null)}
        className="shrink-0 rounded-md px-2 py-1 text-[11.5px] text-muted-foreground hover:text-foreground"
      >
        {t("update.later")}
      </button>
    </div>
  );
}
