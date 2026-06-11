# Fresco App Experience Spec — v1.0
**The end-to-end session flow, redesigned from the beta feedback.**
**Companion to fresco-strategic-brief.md §3–§4. Drop into repo as docs/app-experience-spec.md.**

The test every screen must pass: *does this get a founder to a defensible verdict faster, with less ceremony?*

---

## Moment 1 · Arrival — attack the 48% leak

**Feedback basis:** 10 of 21 testers signed up and never ran a session. Gidon: "Remove 'Choose a house' — your engine, not your interface." Nigel: reduce first-contact load 70%. Maribe: a guided example would reduce friction significantly.

**The new first screen (signed-in home, and guest landing):**

- One input, centred, full focus: **"What decision are you trying to make?"**
- Placeholder shows the expected shape: *"e.g. We've spent six weeks redesigning onboarding, but drop-off happens before step 3 even loads. Do we keep going or stop?"*
- Voice input and doc upload preserved (Nombulelo praised both) as quiet icons inside the field.
- Three example chips beneath, founder-flavoured, that prefill the input on tap: "Should we build this feature?" · "Pivot or stay the course?" · "Is this idea worth a month?" — the lightweight guided example Maribe asked for, without a tutorial.
- First-run only, secondary action: **"See an example session"** — opens a read-only pre-loaded sample (the anonymised Sorted session, consistent with the site's §6). Spends no run. The activation safety-net for the visitor not yet ready to commit a real decision.
- Quota in mono telemetry, top-right: `VERDICTS LEFT THIS MONTH · 2 OF 3`
- **Removed from first contact:** house selection, workspace creation, framework vocabulary, the four-house cards. Workspaces remain reachable from nav for existing users; they are no longer the front door.

## Moment 2 · Routing + clarify — extract before ask

**Feedback basis:** Javier: "it asked me a question I had already answered in my prompt" (and lost his prompt on edit). Nigel: "asks the user to do work the product should do."

**Flow:**

1. Submit → one routing call: classify the house, extract answers to that house's canonical questions from the prompt, identify gaps.
2. Show **"Here's what I took from your description"** — the extracted answers, pre-filled, editable, each confirmable in one tap.
3. Below: only the genuinely missing questions. **Hard cap: 3.** A rich prompt yields zero questions and goes straight to a single confirm step. Each follow-up carries a one-line reason in the mono voice (`NEEDED FOR · what would change your mind`) — asking reads as rigour, not bureaucracy.
4. House badge, small, after routing: `RUNNING AS · INVESTIGATE — change` (power users can override; nobody else need notice). If the classifier is genuinely unsure, default to Investigate — the "is the problem real" analysis is the safest opening — and never ask the user to adjudicate taxonomy.
5. **The original prompt is pinned** — visible at the top of the session from here to the verdict (Mishen, Javier).
6. Editing the prompt at any point is non-destructive: edit-in-place, never navigate away, never lose state.

## Moment 3 · Generation — never silent

**Feedback basis:** Mishen: ~10 minutes with no status; "moments where I wasn't sure whether the system had finished thinking." David/Leandro: unclear loading behaviour.

- Staged generation with real stage labels in the mono voice: `READING INPUT` → `RUNNING ANALYSIS` → `FORMING VERDICT`.
- Stream partial results: analysis sections render as they complete; the verdict is withheld until final, then arrives as the climax (the stamp moment from the site, in-product).
- Time target: perceived progress within 3 seconds, first partial within 30, verdict well inside the coffee promise.

## Moment 4 · The verdict — load-bearing, decisive, honest

**Feedback basis:** the most-praised asset (Maribe, Gidon, Mishen, Skye) buried in an overwhelming output (Mishen, Craig, the post-launch tester). Maribe's hierarchy, verbatim, adopted. Three independent signals for the same fix: when output renders, the question panel must get out of the way.

**On verdict render:**
- The question/input panel **auto-collapses to a slim rail** (re-expandable). The output takes the stage. This is the single highest-priority UI change in the package.

**Output hierarchy, strict order, progressive disclosure:**
1. Verdict — pill + word, semantic colour, spectrum mark with positioned dot
2. Sentence of truth
3. Why this verdict — 3–4 lines
4. **Confidence + what would change it** — new engine output: stated confidence and the named condition that would flip the verdict ("flips to GO if 15 of 20 mechanics accept commission terms")
5. Collapsed by default: key issues → recommended moves → full analysis → lenses. **Lenses surface only after the first verdict exists** ("See this from a different angle") — never before; the houses-vs-lenses confusion dissolves if lenses don't appear until there's something to re-lens.

**Tone calibration (system-prompt work, not UI):** the verdict is decisive; the reasoning is contextual. "Your versatility reads as vagueness" → "Some of your audience may read this breadth as vagueness." Decisiveness lives in the verdict; humility lives in the reasoning. (Skye, Naledi.)

**DecisionGate:** zero usage across 33 beta sessions. Cut from the primary flow. Keep the data model and the new `userDecisions` dashboard stat; surface later as a quiet "log your call" affordance inside decision memory if demand appears.

## Moment 5 · After — decision memory, phase 1

**Feedback basis:** Gidon's Option 2; the retention question (Maribe: "why would a team return weekly?"). The structural thing ChatGPT can't do.

- Home (below the input) shows the **decision log**: each past verdict as one row — date, the decision in one line, verdict chip with semantic colour, house badge. Open to revisit; "run again" to re-test with new evidence.
- The session that produced a verdict is permanent, linkable, and exportable.
- Phase 2 (later): outcome tracking — "what did you decide, what happened" — the public Sorted status line, productised.

---

## Cross-cutting

**Mobile:** stacked, focused states throughout — input full-screen, clarify as a sequence, output as a single column with the collapsed sections. No split-screen below 700px (Craig). The verdict card renders with the same care as the site's.

**Entitlements alignment — the site now promises what the app must honour:**
- Free: 3 verdicts/month (site says so; app must enforce and display it)
- Founder: R450/mo, unlimited verdicts, all lenses, decision memory — tier must exist in the system
- Studio: removed from public ladder; beta cohort grandfathered at Studio for life, untouched
- Lenses gate to Founder+

**Instrumentation (so §7 is measurable):** funnel events — signup → first input focused → first submit → routing complete → verdict rendered → second session within 14 days. Time-to-verdict captured per session. Without this, the re-test can't prove anything.

---

## Work packages, in order

- **WP0 — Instrumentation.** Funnel events + time-to-verdict. Ship first; measure the old flow's last days as baseline. *Small.*
- **WP1 — Arrival + router + extract-before-ask.** Moments 1–2. The leak attack. New routing endpoint, new home, clarify view, pinned prompt, non-destructive edit. *Large; the core of the package.*
- **WP2 — Verdict UI.** Moment 4: auto-collapse rail, output hierarchy, confidence field (engine prompt + schema + UI), tone calibration, DecisionGate removal from flow. *Medium.*
- **WP3 — Generation progress.** Moment 3: staged labels, streaming partials. *Medium; can land with or after WP2.*
- **WP4 — Decision log.** Moment 5 phase 1. *Small–medium.*
- **WP5 — Entitlements.** Founder tier, free quota of 3 verdicts/month, lens gating, Studio grandfathering. *Medium; must land before any paid marketing of the new page.*

Then: strategic brief §7 patch (corrected baselines: 69% completion, 48% activation leak as the metric), and the re-test cohort of 5–8.
