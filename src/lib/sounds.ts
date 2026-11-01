/**
 * Small synthesized cues.
 *
 * They are generated with the Web Audio API instead of shipping audio files:
 * zero bytes over the wire, no decode latency, and the pitch/timbre can match
 * the app's palette.
 *
 * The brief was "bright, soft, short". That translates to three rules applied
 * to every cue below:
 *
 *  - a pure sine or triangle body with a quiet partial above it, never a raw
 *    square (square waves are what make UI sounds feel like a smoke alarm);
 *  - a 4 ms attack and a smooth decay, so nothing starts with a click;
 *  - nothing longer than about 300 ms, except the ring tone, which has to carry.
 *
 * The caller can mute a group, which the settings screen drives through
 * `setSoundEnabled`.
 */

export type Cue =
  | "message"
  | "mention"
  | "notification"
  | "reaction"
  | "pin"
  | "join"
  | "leave"
  | "mute"
  | "unmute"
  | "deafen"
  | "undeafen"
  | "camera-on"
  | "camera-off"
  | "screen-start"
  | "screen-stop"
  | "call-ring"
  | "call-dial"
  | "call-connect"
  | "call-end"
  | "error"
  | "success"
  | "friend"
  | "boost"
  | "gift";

let context: AudioContext | null = null;

const enabled = new Set<Cue>([
  "message",
  "mention",
  "notification",
  "reaction",
  "join",
  "leave",
  "call-ring",
  "call-dial",
  "call-connect",
  "call-end",
  "error",
  "success",
  "friend",
  "boost",
  "gift",
]);

/** Master volume, 0..1. Driven by the settings screen. */
let volume = 1;

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

export function setSoundVolume(next: number) {
  volume = Math.min(1, Math.max(0, next));
}

export function getSoundVolume(): number {
  return volume;
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
  /** Detune in cents, used to make stacked voices shimmer. */
  detune?: number;
}

interface CueShape {
  tones: Tone[];
  /** Overall level of the cue, 0..1. */
  level?: number;
  /** Low-pass cutoff in Hz. Lower means rounder. */
  cutoff?: number;
}

function play(shape: CueShape) {
  const ctx = audio();
  if (!ctx || volume === 0) return;

  const master = ctx.createGain();
  master.gain.value = (shape.level ?? 0.16) * volume;

  // A gentle low-pass removes the fizz above 6 kHz. It is what separates a
  // soft chime from a piercing beep on laptop speakers.
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = shape.cutoff ?? 6200;
  filter.Q.value = 0.7;

  master.connect(filter);
  filter.connect(ctx.destination);

  const now = ctx.currentTime;

  for (const tone of shape.tones) {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = tone.type ?? "sine";
    oscillator.frequency.setValueAtTime(tone.freq, now + tone.at);
    if (tone.detune) oscillator.detune.setValueAtTime(tone.detune, now + tone.at);

    if (tone.to) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, tone.to),
        now + tone.at + tone.duration,
      );
    }

    // Short attack, exponential decay: closer to a soft chime than a beep.
    const peak = tone.gain ?? 1;
    const start = now + tone.at;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + tone.duration + 0.02);
  }
}

const CUES: Record<Cue, () => void> = {
  // Incoming message: one soft note with a quiet octave above. Deliberately
  // quiet, because it fires a lot.
  message: () =>
    play({
      level: 0.12,
      tones: [
        { freq: 783.99, at: 0, duration: 0.1, gain: 0.55 },
        { freq: 1567.98, at: 0, duration: 0.07, gain: 0.18 },
      ],
    }),

  // A mention is the same shape, a third higher and doubled, so it reads as
  // "this one is for you" without being louder.
  mention: () =>
    play({
      level: 0.15,
      tones: [
        { freq: 987.77, at: 0, duration: 0.09, gain: 0.6 },
        { freq: 1318.51, at: 0.075, duration: 0.13, gain: 0.55 },
        { freq: 1975.53, at: 0.075, duration: 0.1, gain: 0.16 },
      ],
    }),

  notification: () =>
    play({
      level: 0.14,
      tones: [
        { freq: 659.25, at: 0, duration: 0.11, gain: 0.6, type: "triangle" },
        { freq: 880, at: 0.085, duration: 0.15, gain: 0.5, type: "triangle" },
      ],
    }),

  // Reacting is a tiny sparkle: two high notes, very low level.
  reaction: () =>
    play({
      level: 0.1,
      cutoff: 9000,
      tones: [
        { freq: 1318.51, at: 0, duration: 0.07, gain: 0.4 },
        { freq: 1760, at: 0.05, duration: 0.09, gain: 0.32 },
      ],
    }),

  pin: () =>
    play({
      level: 0.12,
      tones: [
        { freq: 523.25, at: 0, duration: 0.05, gain: 0.5, type: "triangle" },
        { freq: 392, at: 0.04, duration: 0.07, gain: 0.35, type: "triangle" },
      ],
    }),

  // Others joining a voice channel: a warm rising third.
  join: () =>
    play({
      level: 0.14,
      tones: [
        { freq: 523.25, at: 0, duration: 0.11, gain: 0.55, type: "triangle" },
        { freq: 659.25, at: 0.075, duration: 0.14, gain: 0.5, type: "triangle" },
      ],
    }),

  leave: () =>
    play({
      level: 0.13,
      tones: [
        { freq: 523.25, at: 0, duration: 0.12, gain: 0.5, type: "triangle", to: 349.23 },
      ],
    }),

  mute: () =>
    play({
      level: 0.1,
      cutoff: 2600,
      tones: [{ freq: 293.66, at: 0, duration: 0.07, gain: 0.6, type: "triangle" }],
    }),

  unmute: () =>
    play({
      level: 0.1,
      cutoff: 4200,
      tones: [{ freq: 587.33, at: 0, duration: 0.08, gain: 0.6, type: "triangle" }],
    }),

  deafen: () =>
    play({
      level: 0.1,
      cutoff: 2200,
      tones: [{ freq: 220, at: 0, duration: 0.09, gain: 0.6, type: "triangle" }],
    }),

  undeafen: () =>
    play({
      level: 0.1,
      cutoff: 4200,
      tones: [{ freq: 440, at: 0, duration: 0.09, gain: 0.6, type: "triangle" }],
    }),

  "camera-on": () =>
    play({
      level: 0.12,
      tones: [
        { freq: 698.46, at: 0, duration: 0.06, gain: 0.5 },
        { freq: 1046.5, at: 0.05, duration: 0.08, gain: 0.4 },
      ],
    }),

  "camera-off": () =>
    play({
      level: 0.11,
      tones: [
        { freq: 698.46, at: 0, duration: 0.06, gain: 0.5 },
        { freq: 466.16, at: 0.05, duration: 0.08, gain: 0.4 },
      ],
    }),

  "screen-start": () =>
    play({
      level: 0.13,
      tones: [
        { freq: 587.33, at: 0, duration: 0.08, gain: 0.5 },
        { freq: 880, at: 0.07, duration: 0.1, gain: 0.45 },
        { freq: 1174.66, at: 0.14, duration: 0.12, gain: 0.3 },
      ],
    }),

  "screen-stop": () =>
    play({
      level: 0.12,
      tones: [
        { freq: 880, at: 0, duration: 0.08, gain: 0.45 },
        { freq: 587.33, at: 0.07, duration: 0.11, gain: 0.4 },
      ],
    }),

  // The ring has to survive being heard from another room, so it is the one
  // cue that is intentionally not subdued. The caller repeats it.
  "call-ring": () =>
    play({
      level: 0.2,
      cutoff: 5200,
      tones: [
        { freq: 659.25, at: 0, duration: 0.16, gain: 0.75, type: "triangle" },
        { freq: 880, at: 0.17, duration: 0.2, gain: 0.7, type: "triangle" },
        { freq: 1318.51, at: 0.17, duration: 0.18, gain: 0.15 },
      ],
    }),

  "call-dial": () =>
    play({
      level: 0.12,
      tones: [{ freq: 440, at: 0, duration: 0.24, gain: 0.6, type: "triangle" }],
    }),

  "call-connect": () =>
    play({
      level: 0.16,
      tones: [
        { freq: 523.25, at: 0, duration: 0.1, gain: 0.6 },
        { freq: 659.25, at: 0.08, duration: 0.11, gain: 0.6 },
        { freq: 783.99, at: 0.16, duration: 0.16, gain: 0.55 },
      ],
    }),

  "call-end": () =>
    play({
      level: 0.13,
      tones: [{ freq: 440, at: 0, duration: 0.16, gain: 0.6, type: "triangle", to: 220 }],
    }),

  error: () =>
    play({
      level: 0.12,
      cutoff: 3200,
      tones: [
        { freq: 349.23, at: 0, duration: 0.11, gain: 0.65, type: "triangle" },
        { freq: 261.63, at: 0.13, duration: 0.16, gain: 0.6, type: "triangle" },
      ],
    }),

  success: () =>
    play({
      level: 0.15,
      tones: [
        { freq: 659.25, at: 0, duration: 0.09, gain: 0.55 },
        { freq: 987.77, at: 0.08, duration: 0.14, gain: 0.5 },
      ],
    }),

  friend: () =>
    play({
      level: 0.15,
      tones: [
        { freq: 587.33, at: 0, duration: 0.1, gain: 0.55, type: "triangle" },
        { freq: 880, at: 0.09, duration: 0.14, gain: 0.5, type: "triangle" },
      ],
    }),

  // A boost is rare and celebratory: a four-note arpeggio with a shimmer.
  boost: () =>
    play({
      level: 0.18,
      cutoff: 8000,
      tones: [
        { freq: 523.25, at: 0, duration: 0.1, gain: 0.5 },
        { freq: 659.25, at: 0.09, duration: 0.1, gain: 0.5 },
        { freq: 783.99, at: 0.18, duration: 0.12, gain: 0.5 },
        { freq: 1046.5, at: 0.27, duration: 0.24, gain: 0.45 },
        { freq: 1567.98, at: 0.27, duration: 0.2, gain: 0.16, detune: 6 },
      ],
    }),

  gift: () =>
    play({
      level: 0.16,
      cutoff: 8000,
      tones: [
        { freq: 783.99, at: 0, duration: 0.09, gain: 0.5 },
        { freq: 1174.66, at: 0.07, duration: 0.1, gain: 0.45 },
        { freq: 1567.98, at: 0.14, duration: 0.18, gain: 0.35, detune: -5 },
      ],
    }),
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
