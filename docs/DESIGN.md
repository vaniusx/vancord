# Vancord design notes

## Direction

A small, calm chat app for a closed group of friends. The reference points are a good
notebook and a well-made desktop tool, not a game launcher or an enterprise suite.

- Warm stone paper instead of cold blue-gray.
- One accent only: petrol `#1F5F52`. It marks actions, selection and focus.
- A muted copper `#B0552F` is reserved for unread counts and nothing else.
- Only the logo uses a shape-defining form; everything else is a flat surface with
  a soft radius. No gradients in the product UI.
- Instrument Sans, 15px message body, 14px UI, 12px meta. Nothing below 11px except
  decorative avatar initials.

## Palette

| Token | Light | Dark |
| --- | --- | --- |
| canvas | `#FBFAF8` | `#1A1A18` |
| surface | `#FFFFFF` | `#212120` |
| sidebar | `#F4F2EE` | `#1F1F1D` |
| rail | `#EFECE7` | `#171715` |
| border | `#E2DED6` | `#34342F` |
| ink | `#1B1A17` | `#F1EFE9` |
| muted ink | `#736E65` | `#A6A29A` |
| accent | `#1F5F52` | `#2E7F6E` |
| accent text | `#1F5F52` | `#6FBDA8` |
| signal | `#B0552F` | `#D08A63` |

Contrast measured in the running app: ink 16.7:1 (light) / 15.2:1 (dark),
muted 4.85:1 / 6.85:1, white on solid accent 7.5:1 / 4.8:1. All pass WCAG AA.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ V Vancord                                        – □ ×        │ 40
├────┬──────────────────────┬──────────────────────────────────┤
│ 56 │ server header   52   │  # channel  52                   │
│    │ search          32   ├──────────────────────────────────┤
│    │                      │                                  │
│ s  │ channels             │  messages                        │
│ e  │                      │                                  │
│ r  │ direct messages      │                                  │
│ v  │                      ├──────────────────────────────────┤
│ e  │                      │  composer 44                     │
│ r  │ user card       52   │                                  │
└────┴──────────────────────┴──────────────────────────────────┘
```

Members are a 300px sheet on the right, opened from the channel header, never a
permanent third column. One screen, one job.

## Signature

The mark: a petrol squircle with a rounded V whose right arm is slightly steeper than
the left. It is the only place a shape carries identity, which is why the rest of the
interface can stay quiet.

## Screenshots

- `docs/screenshots/light-1280.png`
- `docs/screenshots/dark-1280.png`