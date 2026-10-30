/**
 * Small synthesized cues.
 *
 * They are generated with the Web Audio API instead of shipping audio files:
 * zero bytes over the wire, no decode latency, and the pitch/timbre can match
 * the app's palette. The caller can mute a group, which the settings screen
 * drives through `setSoundEnabled`.
 */

type Cue =
  | "call-ring"
  | "call-dial"
  | "call-end"
  | "call-connect"
  | "message"
  | "mention"
  | "join"
  | "leave"
  | "mute"
  | "unmute"
  | "error"
  | "success";

let context: AudioContext | null = null;
const enabled = new Set<Cue>([
  "call-ring",
  "call-dial",
  "call-end",
  "call-connect",
  "message",
  "mention",
  "join",
  "leave",
  "error",
  "success",
]);

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

export function setSoundEnabled(cue: Cue, on: boolean) {
  if (on) enabled.add(cue);
  else enabled.delete(cue);
}

export function isSoundEnabled(cue: Cue): boolean {
  return enabled.has(cue);
}

interface Tone {
  /** Frequency in Hz. */
  freq: number;
  /** Start offset in seconds from now. */
  at: number;
  /** Duration in seconds. */
  duration: number;
  gain?: number;
  type?: OscillatorType;
  /** Glide to this frequency by the end of the tone. */
  to?: number;
}

function play(tones: Tone[], masterGain = 0.16) {
  const ctx = audio();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.value = masterGain;
  master.connect(ctx.destination);

  const now = ctx.currentTime;

  for (const tone of tones) {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = tone.type ?? "sine";
    oscillator.frequency.setValueAtTime(tone.freq, now + tone.at);

    if (tone.to) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, tone.to),
        now + tone.at + tone.duration,
      );
    }

    // Short attack, exponential decay: closer to a soft chime than a beep.
    const peak = tone.gain ?? 1;
    envelope.gain.setValueAtTime(0.0001, now + tone.at);
    envelope.gain.exponentialRampToValueAtTime(peak, now + tone.at + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + tone.at + tone.duration);

    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(now + tone.at);
    oscillator.stop(now + tone.at + tone.duration + 0.02);
  }
}

const CUES: Record<Cue, () => void> = {
  // Two rising notes, repeated by the caller.
  "call-ring": () =>
    play([
      { freq: 660, at: 0, duration: 0.16, gain: 0.9 },
      { freq: 880, at: 0.18, duration: 0.22, gain: 0.9 },
    ]),
  // Single low note while waiting for an answer.
  "call-dial": () =>
    play([{ freq: 440, at: 0, duration: 0.28, gain: 0.7, type: "triangle" }]),
  "call-connect": () =>
    play([
      { freq: 523, at: 0, duration: 0.12, gain: 0.8 },
      { freq: 784, at: 0.1, duration: 0.18, gain: 0.8 },
    ]),
  "call-end": () =>
    play([
      { freq: 440, at: 0, duration: 0.14, gain: 0.75, type: "triangle", to: 220 },
    ]),
  message: () => play([{ freq: 784, at: 0, duration: 0.1, gain: 0.5 }], 0.1),
  mention: () =>
    play([
      { freq: 880, at: 0, duration: 0.1, gain: 0.7 },
      { freq: 1175, at: 0.09, duration: 0.14, gain: 0.7 },
    ]),
  join: () =>
    play([
      { freq: 523, at: 0, duration: 0.1, gain: 0.7 },
      { freq: 698, at: 0.08, duration: 0.12, gain: 0.6 },
    ]),
  leave: () =>
    play([
      { freq: 523, at: 0, duration: 0.1, gain: 0.6, type: "triangle", to: 349 },
    ]),
  mute: () => play([{ freq: 300, at: 0, duration: 0.08, gain: 0.4 }], 0.08),
  unmute: () => play([{ freq: 600, at: 0, duration: 0.08, gain: 0.4 }], 0.08),
  error: () =>
    play([
      { freq: 320, at: 0, duration: 0.14, gain: 0.6, type: "square" },
      { freq: 240, at: 0.16, duration: 0.18, gain: 0.6, type: "square" },
    ], 0.1),
  success: () =>
    play([
      { freq: 659, at: 0, duration: 0.1, gain: 0.6 },
      { freq: 988, at: 0.1, duration: 0.16, gain: 0.6 },
    ]),
};

export function playCue(cue: Cue) {
  if (!enabled.has(cue)) return;
  try {
    CUES[cue]();
  } catch {
    // Audio is a nicety; never let it break an action.
  }
}

/** Unlock audio on the first user gesture (browsers require it). */
export function primeAudio() {
  const ctx = audio();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}
