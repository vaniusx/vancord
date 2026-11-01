import { Loader2, Mic, Play, Volume2 } from "@/components/icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/features/app/app-store";
import {
  getSoundVolume,
  isSoundEnabled,
  playCue,
  primeAudio,
  setSoundEnabled,
  setSoundVolume,
} from "@/lib/sounds";
import { cn } from "@/lib/utils";

const CUE_GROUPS: Array<{
  title: string;
  cues: Array<{ id: Parameters<typeof playCue>[0]; label: string }>;
}> = [
  {
    title: "sounds.groupMessages",
    cues: [
      { id: "message", label: "sounds.message" },
      { id: "mention", label: "sounds.mention" },
      { id: "notification", label: "sounds.notification" },
      { id: "reaction", label: "sounds.reaction" },
      { id: "pin", label: "sounds.pin" },
    ],
  },
  {
    title: "sounds.groupVoice",
    cues: [
      { id: "join", label: "sounds.join" },
      { id: "leave", label: "sounds.leave" },
      { id: "mute", label: "sounds.mute" },
      { id: "unmute", label: "sounds.unmute" },
      { id: "deafen", label: "sounds.deafen" },
      { id: "undeafen", label: "sounds.undeafen" },
      { id: "camera-on", label: "sounds.cameraOn" },
      { id: "camera-off", label: "sounds.cameraOff" },
      { id: "screen-start", label: "sounds.screenStart" },
      { id: "screen-stop", label: "sounds.screenStop" },
    ],
  },
  {
    title: "sounds.groupCalls",
    cues: [
      { id: "call-ring", label: "sounds.ring" },
      { id: "call-dial", label: "sounds.dial" },
      { id: "call-connect", label: "sounds.connect" },
      { id: "call-end", label: "sounds.end" },
    ],
  },
  {
    title: "sounds.groupSocial",
    cues: [
      { id: "friend", label: "sounds.friend" },
      { id: "gift", label: "sounds.gift" },
      { id: "boost", label: "sounds.boost" },
      { id: "success", label: "sounds.success" },
      { id: "error", label: "sounds.error" },
    ],
  },
];

/** Voice and video devices plus capture processing. */
export function VoiceSection() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const noiseSuppression = useAppStore((state) => state.noiseSuppression);
  const setNoiseSuppression = useAppStore((state) => state.setNoiseSuppression);
  const echoCancellation = useAppStore((state) => state.echoCancellation);
  const setEchoCancellation = useAppStore((state) => state.setEchoCancellation);

  const refreshDevices = async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all);
      if (!input) {
        const first = all.find((device) => device.kind === "audioinput");
        if (first) setInput(first.deviceId);
      }
      if (!output) {
        const first = all.find((device) => device.kind === "audiooutput");
        if (first) setOutput(first.deviceId);
      }
    } catch {
      setDevices([]);
    }
  };

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener("devicechange", refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", refreshDevices);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testMic = async () => {
    setTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: input ? { exact: input } : undefined,
          noiseSuppression,
          echoCancellation,
        },
      });
      const Ctor = window.AudioContext;
      const context = new Ctor();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const average = data.reduce((sum, value) => sum + value, 0) / data.length;
        setLevel(Math.min(100, Math.round((average / 255) * 220)));
        if (context.state === "running") requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop());
        void context.close();
        setTesting(false);
        setLevel(0);
      }, 5000);
    } catch {
      toast.error(t("voice.micDenied"));
      setTesting(false);
    }
  };

  const inputs = devices.filter((device) => device.kind === "audioinput");
  const outputs = devices.filter((device) => device.kind === "audiooutput");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="audio-input">{t("voiceSettings.input")}</Label>
        <select
          id="audio-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
        >
          {inputs.length === 0 ? <option value="">{t("voiceSettings.none")}</option> : null}
          {inputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || t("voiceSettings.microphone")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-8" disabled={testing} onClick={() => void testMic()}>
          {testing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Mic className="mr-1.5 size-3.5" />}
          {t("voiceSettings.testMic")}
        </Button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              level > 70 ? "bg-status-dnd" : level > 30 ? "bg-status-online" : "bg-primary",
            )}
            style={{ width: `${level}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border/60 pt-4">
        <Label htmlFor="audio-output">{t("voiceSettings.output")}</Label>
        <select
          id="audio-output"
          value={output}
          onChange={(event) => setOutput(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
        >
          {outputs.length === 0 ? <option value="">{t("voiceSettings.none")}</option> : null}
          {outputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || t("voiceSettings.speaker")}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium">{t("voiceSettings.noise")}</p>
            <p className="text-[11px] text-muted-foreground">{t("voiceSettings.noiseHint")}</p>
          </div>
          <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium">{t("voiceSettings.echo")}</p>
            <p className="text-[11px] text-muted-foreground">{t("voiceSettings.echoHint")}</p>
          </div>
          <Switch checked={echoCancellation} onCheckedChange={setEchoCancellation} />
        </div>
      </div>
    </div>
  );
}

/** Sound effect mixer: each cue can be turned off and previewed. */
export function SoundsSection() {
  const { t } = useTranslation();
  const [, force] = useState(0);
  const [volume, setVolumeState] = useState(() => Math.round(getSoundVolume() * 100));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12.5px] font-semibold">{t("sounds.title")}</p>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">{t("sounds.body")}</p>
      </div>

      <div className="rounded-xl border border-border/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] font-medium">{t("sounds.volume")}</span>
          <span className="text-[11.5px] text-muted-foreground tabular-nums">{volume}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={volume}
          aria-label={t("sounds.volume")}
          onChange={(event) => {
            const next = Number(event.target.value);
            setVolumeState(next);
            setSoundVolume(next / 100);
          }}
          onPointerUp={() => {
            primeAudio();
            playCue("message");
          }}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        />
      </div>

      {CUE_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-1 px-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {t(group.title)}
          </p>
          <div className="space-y-0.5">
            {group.cues.map(({ id, label }) => (
              <div
                key={id}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-accent/40"
              >
                <Volume2 className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{t(label)}</span>
                <button
                  type="button"
                  onClick={() => {
                    primeAudio();
                    playCue(id);
                  }}
                  aria-label={t("sounds.preview")}
                  title={t("sounds.preview")}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Play className="size-3.5" />
                </button>
                <Switch
                  checked={isSoundEnabled(id)}
                  onCheckedChange={(value) => {
                    setSoundEnabled(id, value);
                    force((n) => n + 1);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
