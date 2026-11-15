---
title: Accessibility, Sound & Languages
description: Alert sounds, audio description, keyboard operation of the 3D body, skip links and live regions in the Astronaut Health Intelligence Platform, plus the language policy of the interface.
status: IMPLEMENTED
code:
  - frontend/web/src/features/a11y/alarmSchedule.ts
  - frontend/web/src/features/a11y/earcons.ts
  - frontend/web/src/features/a11y/describe.ts
  - frontend/web/src/features/a11y/A11ySettings.tsx
  - frontend/web/src/features/a11y/SkipLinks.tsx
  - frontend/web/src/features/anatomy/a11y
  - frontend/web/src/i18n/index.ts
  - frontend/web/src/features/topbar/LanguageMenu.tsx
tests:
  - frontend/web/src/features/a11y/alarmSchedule.test.ts
  - frontend/web/src/features/a11y/describe.test.ts
  - frontend/web/src/i18n/i18n.test.ts
verified: 2026-11-15
---

# Accessibility, Sound & Languages

A health monitor is used with busy eyes and busy hands: during exercise, during a procedure, from across a module. The Astronaut Health Intelligence Platform (AHI) therefore says important things in more than one way: color plus icon plus words, sound for alerts that need action, speech on request, and a full keyboard path, including the 3D body.

All settings live in **Tools > Accessibility and sound** and are remembered per device.

## Alert sounds

| Rule | Behavior |
| --- | --- |
| What rings | Open (not acknowledged, not resolved) **critical** alerts; **warnings** too if "Also for warnings" is on |
| Default | Sound for critical alerts **on**, warnings off |
| Sound | One short tone pattern (earcon) per severity, generated with the Web Audio API: no audio files |
| Repeat | Every 30 s while a critical alert stays open; every 2 min for a warning |
| Escalation | A critical alert still unacknowledged after 2 min (or escalated by the engine) switches to a more urgent sound that repeats every 15 s |
| One sound at a time | The most urgent open alert decides the sound; five open alerts never make five sounds |
| History is silent | Alerts created before the page loaded or before the scenario restarted never ring |
| Blocked audio | If the browser blocks sound until a click, an **Enable sound** prompt appears |

The rules follow the spirit of the IEC 60601-1-8 alarm guidance (avoid alarm fatigue, escalate what is ignored). The intervals are demo configuration, not an official limit. Repeats count real time, not simulation time, so a fast simulation does not make the app beep faster.

## Audio description

Spoken explanations with the browser's built in speech synthesis. **Off by default.** Nothing is sent anywhere.

| Key | Action |
| --- | --- |
| `D` | Describe the screen (press again to stop) |
| `Shift` + `D` | Turn audio description on or off |
| `Esc` | Stop speaking |

When on, it reads new critical and high alerts, status changes and what you select. Voice speed goes from 0.6x to 1.6x. Every spoken health summary says the data is simulated, and missing data is spoken as "no data", never as normal. Screen reader users may not need it: the same events are announced through `aria-live` regions.

## Keyboard and the 3D body

The 3D viewer has a keyboard path, the **body navigator** ([3D anatomy](../architecture/anatomy-3d#keyboard-body-navigator)):

| Key | Action |
| --- | --- |
| `Tab` | Reach the body navigator |
| `Up` / `Down` | Previous or next monitored region |
| `Left` / `Right` | Previous or next structure in the region |
| `Home` / `End` | First or last |
| `Enter` | Select |
| `Esc` | Clear the selection |

Each move is announced, for example "Heart region. Status: Nominal." A region with no readings is announced as "no data".

Global shortcuts (`1` to `4`, `V`, `P`, `A`, `Space`, `?` and others) are listed in the app with `?` and in [Design system](./design-system).

## Skip links and live regions

- Two skip links are the first focusable elements: **Skip to main content** and **Skip to what needs attention** (the attention panel in Ground view, the actions card in Crew view).
- `aria-live` regions announce alerts, status changes and the body navigator; the assistant conversation is a `log` region.
- Status never relies on color only; `prefers-reduced-motion` slows and dims the body scan and disables animations.

## Languages

**English is the default** and the reference language for the international judging; it is identical with or without the language layer. Plain language comes first and the technical term second (for example "Breathing rate" before "respiratory rate").

Four other languages are **optional**: Português (Brasil), Español, 日本語 and Deutsch. Pick one in **Tools > Language**.

| Rule | Behavior |
| --- | --- |
| Status of the translations | **Machine assisted, pending native review.** Each non English entry in the picker says so in its tooltip; only English is reviewed |
| Default | English. The browser language is never applied automatically; the choice is remembered on the device |
| Loading | English ships in the main bundle; the other languages are separate chunks downloaded only when picked. Japanese loads a Japanese font on demand |
| Way back | Outside English the menu item reads "Language" in both languages, so anyone can switch back |
| What stays untranslated | `SIMULATED`, `REAL_PUBLIC`, metric codes, rule ids and units; messages and reports sent to the ground stay in English |
| Speech | Audio description uses a voice of the selected language when the system has one |

A unit test checks that every language has exactly the English keys, no empty strings, the same placeholders, no dash characters and the protected tokens untranslated. <StatusBadge status="EXPERIMENTAL" /> until the native review is done.

## Limitations

- No formal WCAG audit and no structured screen reader test has been done yet.
- Speech synthesis and recognition quality depend on the browser and the operating system voices.
- The earcons are designed for distinctness, not validated against a standard alarm sound set.

## Status

<StatusBadge status="IMPLEMENTED" /> Alarm scheduling (`alarmSchedule.test.ts`) and spoken text (`describe.test.ts`) are unit tested.

## Next steps

- [Design system](./design-system)
- [Product tour](./product-tour)
- [Limitations and known issues](../validation/limitations)
