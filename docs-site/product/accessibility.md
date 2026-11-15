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
  - frontend/web/src/features/a11y/languageSpeech.ts
  - frontend/web/src/i18n/engineText.ts
  - frontend/web/src/engine/msg.ts
  - frontend/web/src/i18n/pseudo.ts
  - frontend/web/scripts/i18n-sweep.mjs
  - frontend/web/src/components/viz/Details.tsx
  - frontend/web/src/app/useStatusFavicon.ts
tests:
  - frontend/web/src/features/a11y/alarmSchedule.test.ts
  - frontend/web/src/features/a11y/describe.test.ts
  - frontend/web/src/i18n/i18n.test.ts
  - frontend/web/src/i18n/engineText.test.ts
  - frontend/web/src/features/a11y/languageSpeech.test.ts
  - frontend/web/src/app/useStatusFavicon.test.ts
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

**One voice at a time across a language change.** Changing the language cancels every voice: the speech synthesis and every app queue (audio description, describe the screen, the assistant read aloud), so nothing keeps talking in the old language. The on screen description closes too, since its text is in the old language. With audio description on, AHI then says one short sentence in the new language (in English: "Speaking English now."), after a pause of 150 ms because some speech engines drop an utterance queued right after a cancel.

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
- Visual first panels keep their sentences behind a **Details** toggle. While closed, the text is only visually hidden (`sr-only`), so screen readers and audio description still get it. Gauges carry an accessible label with the value, the personal normal and the status in words.
- An open CRITICAL alert also puts a red dot on the browser tab icon, a cue that works when the tab is hidden.
- The mission backdrop is decorative (`aria-hidden`); its parallax and animations stop under reduced motion.

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

### Engine text {#engine-text}

The health engine writes its sentences in English (risk headlines, factors, recommendations, alerts, region summaries). Next to each sentence it attaches a structured message: a stable id plus parameters (`src/engine/msg.ts`). The interface renders engine text through `src/i18n/engineText.ts`, never the raw English field:

- In English the engine's own sentence is returned unchanged.
- In another language the message is rendered from its `eng.*` keys; metric and region names, units and durations come from the catalog.
- If a message or one of its keys is missing, the English sentence is shown, never a half translated one.
- A caller that only has the English text still gets a translation: the engine remembers each sentence it produced together with its message.

`engineText.test.ts` checks that English stays identical and that translated messages render. Not every engine text is covered yet: some exam notes, forecast notes, data quality notes and mission profile texts still appear in English in the other languages. Plain text handover and packets to the ground stay English by design.

### Finding untranslated text {#finding-untranslated-text}

Two developer tools, not part of the product:

| Tool | What it does |
| --- | --- |
| Pseudo locale `qps` | Dev builds only. Open the app with `?lang=qps` (or set `ahi.pseudo.v1` in local storage); `?lang=en` turns it off. Every translated string is wrapped in ⟦ ⟧, so plain English without brackets on screen bypassed the translation layer. Dates, numbers and the picker stay English. Never in the language picker, never in production builds |
| `node scripts/i18n-sweep.mjs` | Run inside `frontend/web` (`--json` for machine output). Lists JSX text and literal `title`, `aria-label`, `placeholder`, `label` and `alt` values in `src/features` that bypass `t()`. A heuristic: review each hit before translating |

## Limitations

- No formal WCAG audit and no structured screen reader test has been done yet.
- Speech synthesis and recognition quality depend on the browser and the operating system voices.
- The earcons are designed for distinctness, not validated against a standard alarm sound set.
- Some engine texts are still English when another language is selected ([Engine text](#engine-text)).

## Status

<StatusBadge status="IMPLEMENTED" /> Alarm scheduling (`alarmSchedule.test.ts`), spoken text (`describe.test.ts`), the speech stop on a language change (`languageSpeech.test.ts`), engine text rendering (`engineText.test.ts`) and the tab icon rule (`useStatusFavicon.test.ts`) are unit tested.

## Next steps

- [Design system](./design-system)
- [Product tour](./product-tour)
- [Limitations and known issues](../validation/limitations)
