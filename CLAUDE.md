# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FlashCard Lite — a Vietnamese-language, single-page flashcard app for learning English vocabulary using the FSRS-6 (Free Spaced Repetition Scheduler v6) algorithm. Vanilla JS/HTML/CSS, no framework, no bundler, no build step, no package.json, no test suite.

Live deployment: https://trantien2k5.github.io/flashcard-lite/ (GitHub Pages, served directly from the `main` branch root — no build/CI step; pushing to `main` updates the live site).

## Running the app

There is no build/dev-server tooling in this repo. Since topic data is fetched dynamically (`loadTopicsDynamic`, in `js/core/app.js`, injects `<script>` tags), opening `index.html` directly via `file://` will generally work, but serving over HTTP avoids any edge-case script-loading issues:

```
npx serve .
# or
python -m http.server
```

Then open the served URL. There is no lint or test command configured.

## Architecture

Everything runs client-side with global objects attached to `window` (or, for `const`/`let`/`class` declarations, to the shared top-level script scope — see the Conventions note below); there are no ES modules, no imports/exports, no bundler. The project is organized feature-first, mirrored identically between `css/` and `js/`:

```
index.html
css/core/          — shared design tokens/layout/components/utilities (mirrors js/core/ in spirit, not in file names).
css/features/*.css — one file per tab/screen, same names as js/features/*.js.
js/core/       — dependency-ordered shared layer: fsrs → storage → stats-queries/demo-data → app.
js/features/*.js — one file per tab/screen: template HTML + render logic only, no algorithm, no storage.
data/          — vocabulary topic data files (one file per topic-group, loaded dynamically)
```

`css/` is split by responsibility, not by tab-in-isolation, so genuinely shared code lives in exactly one place instead of being duplicated per screen. `js/` is split by dependency layer within `js/core/`, each layer only allowed to depend on the ones before it: `fsrs.js` (pure algorithm, zero dependencies) → `storage.js` (data layer, calls into `fsrs.js`, owns `localStorage`, defines the `FlashcardDB` class + `db` singleton) → `stats-queries.js`/`demo-data.js` (add derived-query and demo-data methods onto `FlashcardDB.prototype` — split out of `storage.js` because they're a different reason to change: new analytics vs. new persistence format vs. demo-data tweaks) → `app.js` (state/navigation/theme/toast + bootstrap, shared by every page); then `js/features/*.js` (one file per tab — UI/template logic only, calls into `db` and `js/core/app.js` but never touches `localStorage` or FSRS math directly). No modules, so load order is enforced by `<script>` tag order in `index.html`, not by imports — a later-loading file may use globals an earlier one defined, never the reverse. The one exception is `js/core/app.js`'s `DOMContentLoaded` handler (which calls `renderReview()`, defined in `js/features/review.js`, loaded *after* `js/core/app.js`): that's safe because the handler body only runs once the `DOMContentLoaded` event fires, which happens after every `<script>` tag on the page — regardless of order — has already executed, so by then `renderReview()` exists. Prototype extension (`FlashcardDB.prototype.foo = function () {...}` in `stats-queries.js`/`demo-data.js`) is the vanilla-JS way to split one class's methods across files without modules — it must load after `storage.js` defines the class, but can load before or after `db` is instantiated, since prototype lookups happen at call time, not at object-creation time.

### `css/core/` + `css/features/`

```
css/core/base.css        — design tokens (:root, incl. light-theme overrides), CSS reset, body/html base,
                            background orbs, shared keyframes (fadeUp/fadeIn/bounce/scaleIn).
css/core/layout.css      — structural regions: .app-container/.tab-pane, bottom nav (.bottom-nav/.tab-btn).
css/core/components.css  — reusable UI widgets used on ≥2 tabs: modal, toast, buttons (.btn-primary/
                            -secondary/-danger/-text), skeleton loading, .section-card/-header/-title/-badge.
css/core/utilities.css   — small helper classes (flex/layout shorthands) used across features.
css/features/review.css    — Review tab only (dashboard + entry points into study/practice modes).
css/features/topics.css    — Topics tab only.
css/features/stats.css     — Stats tab only.
css/features/study.css     — Flip-card study session only.
css/features/settings.css  — Settings tab only.
css/features/practice.css  — Practice modes (multiple-choice/typing/dictation) only.
```

A selector belongs in `css/core/components.css` only if it's actually used on more than one tab (verify with `grep` across `js/features/*.js`, not just by a generic-sounding name); if a future change reuses a feature-only selector elsewhere, promote it to `components.css` then.

### `js/core/` — fsrs → storage → stats-queries/demo-data → app

- **`js/core/fsrs.js`** — Pure FSRS-6 spaced-repetition logic. No DOM, no `localStorage`, no `db`, no render — takes a card state and a rating in, returns a new card state out. Models memory per card as `difficulty` (D, 1–10) and `stability` (S, days), from which `retrievability(elapsedDays, stability)` (the forgetting curve) is derived. Defines `RATING` constants (AGAIN/HARD/GOOD/EASY), `createCardState(wordId)`, `fsrs(card, rating, requestRetention?)` (the scheduler — returns a new immutable card state with updated `difficulty`, `stability`, `interval` (days, fractional during short learning/relearning steps), `reps`, `lapses`, `state` (`new`|`learning`|`review`|`relearning`), and `nextReview` timestamp), and `previewNextInterval(card, rating)` (non-mutating preview used for the rating-button labels in the UI, sharing its computation with `fsrs()` via the internal `_computeFSRS` helper). `FSRS_WEIGHTS` holds the 21 default trained weights (w0–w20); `REQUEST_RETENTION` (default 0.9) controls how far out reviews are scheduled. Cards saved before the FSRS-6 upgrade (missing `difficulty`/`stability`) are auto-migrated: `fsrs()` treats a card with `stability == null` as a first review regardless of its stored `state`. Has no dependency on anything else — loads first.
- **`js/core/storage.js`** — `FlashcardDB` class, instantiated once as the global singleton `db`. Wraps `localStorage` (key `flashcard_lite_db`) for persistence only: `_load`/`save`/`_withDefaults` (fills in any top-level or nested field — `cards`/`settings`/`stats.dailyLog`/`stats.ratingLog`/`meta` — missing from a loaded or imported payload, so partial/legacy data never crashes a downstream query expecting the full shape), card CRUD (`getCard`/`updateCard` — calls into `js/core/fsrs.js`'s `fsrs()`), settings (`get settings`/`updateSettings`), stats/streak (`get stats`/`recordStudySession`), and JSON export/import/reset (`importData` also runs the parsed payload through `_withDefaults`). The stored `dailyReviewLimit` setting field is legacy/unused (no UI, no enforcement) — left in `_defaultData()` only so old exported/imported JSON backups still parse. Does **not** contain derived-stats queries or demo-data generation — see the two files below, which add methods onto `FlashcardDB.prototype` from outside the class body (the vanilla-JS way to split one class across files without modules). Loads after `js/core/fsrs.js`, before `js/core/stats-queries.js`/`js/core/demo-data.js`.
- **`js/core/stats-queries.js`** — Adds every derived-stats query used by the UI onto `FlashcardDB.prototype`: due-card selection (`getDueCards(topicId, topic)` — returns **every** matching learning/review/new card for that topic, unlimited; the `dailyNewCards` setting is **not** a hard cap, it's just a configurable value in Settings with no consumer that reads it as a goal today), `getTotalWordStats`, `getTopicProgress`, streaks/accuracy (`getAccuracyRate`), heatmap data (`getMonthlyActivity`), weak-word detection (`getWeakWords`), real FSRS retrievability prediction (`getFSRSPredictions`, using `js/core/fsrs.js`'s `retrievability()` against each card's actual `stability`/`lastReview`), and `getWeeklySummary`. Any query bucketing cards by state must account for all four FSRS states (`new`/`learning`/`review`/`relearning`) — it's easy to forget `relearning` (a card that lapsed after graduating) since it didn't exist before the FSRS-6 upgrade. Split out of `storage.js` because "add a new stat" is a different reason to change than "change how data is persisted." Loads right after `js/core/storage.js`.
- **`js/core/demo-data.js`** — Adds `isDemoActive()`/`enableDemoData()`/`disableDemoData()`/`_generateMockData()` onto `FlashcardDB.prototype` — generates and swaps in a fake "long-time user" dataset (streak, heatmap, weak words, due cards) for previewing the UI, backing up the real data to a separate `localStorage` key first and restoring it on disable (`disableDemoData` guards the backup's `JSON.parse` with try/catch and runs the result through `storage.js`'s `_withDefaults`, so a corrupted backup falls back to defaults instead of throwing). Entirely independent of real persistence logic — split out because "tweak the demo scenario" is a different reason to change than "change how data is persisted." Loads right after `js/core/stats-queries.js`.
- **`js/core/app.js`** — Small pieces shared by every page, plus app bootstrap: `currentTab`/`studySession` (mutable global UI state), `switchTab()` (activates a tab pane/nav button and calls that tab's render fn — `renderReview`/`renderTopics`/`renderStats`/`renderSettings`), `applyTheme()` (toggles the light/dark theme class on `<html>`/`<body>`), `showToast()` (floating notification, callable from any page), `loadTopicsDynamic()` (injects the 30 `data/*.js` `<script>` tags — the place to register new topic files), and the `DOMContentLoaded` handler (applies the saved theme, wires nav buttons, awaits `loadTopicsDynamic()`, then triggers the first render). A function belongs in the shared part only if it's genuinely cross-page (verified by actual call sites, not by how generic its name sounds). When in doubt, add a new helper inside the feature file that needs it; promote it to `app.js` only once a second page actually needs it too. Loads after `js/core/demo-data.js`, before `js/features/*.js`.
- **`js/features/*.js`** — One file per tab/screen. Each contains **only that page's logic**: pure HTML-string template functions attached to the global `window.TEMPLATES` namespace (e.g. `TEMPLATES.studySession`, `TEMPLATES.topics`, `TEMPLATES.settings`) plus the matching `render*()` function that injects the template into the DOM via `innerHTML`. No FSRS algorithm (call `js/core/fsrs.js`'s functions instead) and no direct `localStorage` access (go through `db`, from `js/core/storage.js`, instead). They read from `db` and `TOPICS` but don't mutate state directly (except via `js/core/app.js`'s `studySession`). Styling for each lives in the matching `css/features/*.css` file (plus `css/core/components.css` for anything shared).
  - **`js/features/review.js`** — `TEMPLATES.review` + `renderReview()`. The default/first tab: an action-oriented dashboard with today's due-count, streak, and overall progress, a button into `openGlobalStudySession()` (defined in `study.js`, studies every due card across all topics), and a grid of entry points into the three practice modes (`openPracticeConfig(mode)`, in `practice.js`).
  - **`js/features/topics.js`** — `TEMPLATES.topics` + `renderTopics()` (full 30-topic grid with per-topic progress/due badges) + `openTopicStudy(topicId)` (builds the study queue for one topic and hands off into `js/features/study.js` via `js/core/app.js`'s `studySession`).
  - **`js/features/stats.js`** — `TEMPLATES.stats` + `renderStats()` (called lazily, only when the Stats tab is opened). Everything analytical: streak + 7-day accuracy, FSRS memory forecast (current/7d/30d/90d retrievability), top-3 weakest words by lapse count, achievement badges, weekly summary, and the 30-day activity heatmap.
  - **`js/features/study.js`** — `TEMPLATES.studySession`/`finishScreen`/`noCardsScreen`, `openGlobalStudySession()` (all-topics due-card session), `applyStudyOrder(queue, studyOrder)`, `flipCard()`/`rateCard()`, `endStudyEarly()`, keyboard shortcuts (1–4, Space/Enter — study-only, so they live here rather than in `app.js`), text-to-speech (`speakWord()`). During an active study session, `document.body` gets a `study-focus` class (set by `setStudyFocusMode()`) which hides the bottom nav via CSS for a distraction-free flip-card view.
  - **`js/features/settings.js`** — `TEMPLATES.settings` + `renderSettings()`, `saveSetting()`, demo-data toggle, export/import/reset.
  - **`js/features/practice.js`** — `TEMPLATES.practiceConfig`/`practiceMultipleChoice`/`practiceTyping`/`practiceDictation`/`practiceFinish`, `openPracticeConfig(mode)` + `startPracticeSession(mode)` (reads cards via `db.getCard(wordId)`, never `db.cards` directly), answer-checking + scoring, and its own TTS helper (`playPracticeSpeech`) separate from `study.js`'s `speakWord`.
- **`data/*.js`** (e.g. `finance_banking.js`, `toeic.js`) — Topic/vocabulary data files. Each is an IIFE that pushes one or more `{ id, name, icon, color, description, words: [...] }` objects onto `window.TOPICS`, guarded against double-registration. These are loaded dynamically at runtime (not via static `<script>` tags in `index.html`) by `loadTopicsDynamic()` in `js/core/app.js`, which is the place to register new topic files. Each script tag is created with `script.async = false` so the browser executes them in the order listed in `topicFiles` (still fetched in parallel) — without this, `window.TOPICS` order (and therefore the topic list the user sees) would depend on unpredictable network timing.

The app has 4 tabs, wired in `index.html` (`.tab-pane` + matching `.tab-btn[data-tab]`, switched by `switchTab()` in `js/core/app.js`): **Ôn tập/Review** (default tab — due-count/streak/progress dashboard, global FSRS review, and entry points into the 3 practice modes), **Chủ đề/Topics** (full 30-topic list → per-topic study session), **Thống kê/Stats** (deeper analytics: accuracy, FSRS forecast, weak words, achievements, weekly summary, activity heatmap), **Cài đặt/Settings**. Practice mode (multiple-choice/typing/dictation, `js/features/practice.js`) is reached from the Review tab but renders into the same `#review-content` container rather than being a fifth tab.

### Data flow for a study session

1. Either `openTopicStudy(topicId)` (`js/features/topics.js`, one topic) or `openGlobalStudySession()` (`js/features/study.js`, every topic) asks `db.getDueCards(topicId, topic)` for **every** card due now (priority: learning/relearning → review → new, unlimited — no daily cap), then `applyStudyOrder()` (`js/features/study.js`) reorders the queue per the `studyOrder` setting (`due`|`random`|`alphabetical`), and writes the result into `js/core/app.js`'s `studySession`.
2. `studySession` holds the queue and progress (`totalDue` grows when a card is requeued after AGAIN, so the progress bar/counter stay accurate); `TEMPLATES.studySession` (`js/features/study.js`) renders the current card, with rating-button time labels computed by `previewNextInterval()`.
3. `rateCard(rating)` (`js/features/study.js`) calls `db.updateCard(wordId, rating)`, which runs `fsrs()` and persists to `localStorage`; `AGAIN` ratings requeue the card within the same session.
4. On completion, `db.recordStudySession()` updates streaks/daily logs, and `TEMPLATES.finishScreen` is rendered (or `TEMPLATES.noCardsScreen` if the queue was empty to begin with).

Practice mode (`js/features/practice.js`) is a separate, independent flow: `startPracticeSession(mode)` samples a random subset of words from one or all topics via `db.getCard(wordId)`, tracks `correctCount`/`incorrectCount` in-memory only (does **not** call `db.updateCard`/`fsrs()` — practice answers don't affect FSRS scheduling), and ends at `TEMPLATES.practiceFinish` with a session accuracy score.

### Adding a new vocabulary topic

Create a new IIFE file under `data/` following the `finance_banking.js` pattern (unique `topic.id`, unique `word.id` prefixes), then add its path to the `topicFiles` array in `loadTopicsDynamic()` (`js/core/app.js`).

### Conventions

- All user-facing strings and code comments are in Vietnamese; keep new UI text consistent with this.
- No modules — new globals must be attached explicitly (e.g. `window.TEMPLATES.xxx = ...`, guarded with `if (!window.TEMPLATES) window.TEMPLATES = {}`). Top-level `function` declarations become `window.fnName` automatically; top-level `const`/`let`/`class` (e.g. `RATING`, `db`, `currentTab`) do **not** become `window.xxx` properties, but they're still readable/writable as bare identifiers from any other script file, since all non-module `<script>` tags share one global lexical scope. Don't be misled by a `typeof window.RATING === 'undefined'` check — test `typeof RATING` instead.
- `js/core/fsrs.js` functions are pure; keep storage/DOM concerns out of it and in `js/core/storage.js` / `js/features/*.js` instead. `js/features/*.js` files, in turn, hold UI/template logic only — no FSRS math, no direct `localStorage` access.
- Script load order in `index.html` is load-bearing: `js/core/fsrs.js` → `js/core/storage.js` → `js/core/stats-queries.js` → `js/core/demo-data.js` → `js/core/app.js` → `js/features/*.js`. A file may use globals a prior file defined, never the reverse. When adding a new top-level `const`/`let`/`class`/`function`, check it isn't already declared elsewhere (`grep` across `js/`) — redeclaring the same top-level name in two loaded scripts throws a `SyntaxError`. New `FlashcardDB` methods go in `storage.js` if they read/write `localStorage` directly, `stats-queries.js` if they're a derived/computed query, or `demo-data.js` if they're demo-only — using `FlashcardDB.prototype.name = function () {...}` in the latter two, not `class` syntax.
- When adding a new screen/feature: create `js/features/<name>.js` + `css/features/<name>.css`, and add both a `<script>` and `<link>` tag to `index.html` in the right position (JS position matters for load order — after `js/core/app.js`; CSS position doesn't). Only touch `js/core/app.js`, `js/core/storage.js`, `js/core/fsrs.js`, or `css/core/components.css` for something genuinely reused across ≥2 pages — see the "verified by actual call sites" rule above.

## Git workflow

The user has authorized skipping manual review: after making a change, commit, push to the session's assigned branch, open/update the PR, and merge it immediately (no need to pause for confirmation before merging). Direct `git push` to `main` is not available in this session type — landing on `main` always goes through opening a PR on the assigned branch and merging it via the GitHub API.

## "Khung 3000 từ" vocabulary framework

Design target: 30 topics × 100 words (60 core / 25 intermediate / 15 advanced) = 3000 words. Status: **complete** — all 30 topic files under `data/` (see the `topicFiles` array in `loadTopicsDynamic()`, `js/core/app.js`) are registered and each has exactly 100 words, with 3000 globally-unique word IDs and no topic-ID collisions. `data/finance.js` (old 20-word version, superseded by `data/finance_banking.js`) and `data/toeic.js` (old TOEIC set) exist on disk but are deliberately left unregistered — see the comment right after the `topicFiles` array.
