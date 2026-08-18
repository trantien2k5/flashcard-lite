# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FlashCard Lite — a Vietnamese-language, single-page flashcard app for learning English vocabulary using the FSRS-6 (Free Spaced Repetition Scheduler v6) algorithm. Vanilla JS/HTML/CSS, no framework, no bundler, no build step, no package.json, no test suite.

Live deployment: https://trantien2k5.github.io/flashcard-lite/ (GitHub Pages, served directly from the `main` branch root — no build/CI step; pushing to `main` updates the live site).

## Running the app

There is no build/dev-server tooling in this repo. Since topic data is fetched dynamically (`loadTopicsDynamic`, in `js/app.js`, injects `<script>` tags), opening `index.html` directly via `file://` will generally work, but serving over HTTP avoids any edge-case script-loading issues:

```
npx serve .
# or
python -m http.server
```

Then open the served URL. There is no lint or test command configured.

## Architecture

Everything runs client-side with global objects attached to `window` (or, for `const`/`let`/`class` declarations, to the shared top-level script scope — see the Conventions note below); there are no ES modules, no imports/exports, no bundler. The project is 4 top-level files/folders:

```
index.html
css/           — styles, split by architectural layer (Base → Layout → Components → Pages)
js/fsrs.js          — pure FSRS-6 algorithm: no DOM, no localStorage, no `db`, no render.
js/storage.js       — FlashcardDB class + the `db` singleton: persistence only (load/save/CRUD/settings).
js/stats-queries.js — derived-stats queries, added onto FlashcardDB.prototype (due cards, streaks, FSRS forecast...).
js/demo-data.js     — mock-data generator + demo on/off, added onto FlashcardDB.prototype.
js/app.js           — state, navigation, theme, toast, and app bootstrap (loadTopicsDynamic + DOMContentLoaded).
js/pages/*.js  — one file per tab/screen: template HTML + render logic only, no algorithm, no storage.
data/          — vocabulary topic data files (one file per topic-group, loaded dynamically)
```

`css/` is split by responsibility, not by tab-in-isolation, so genuinely shared code lives in exactly one place instead of being duplicated per screen. `js/` is split by dependency layer, each layer only allowed to depend on the ones before it: `fsrs.js` (pure algorithm, zero dependencies) → `storage.js` (data layer, calls into `fsrs.js`, owns `localStorage`, defines the `FlashcardDB` class + `db` singleton) → `stats-queries.js`/`demo-data.js` (add derived-query and demo-data methods onto `FlashcardDB.prototype` — split out of `storage.js` because they're a different reason to change: new analytics vs. new persistence format vs. demo-data tweaks) → `app.js` (state/navigation/theme/toast + bootstrap, shared by every page) → `pages/*.js` (one file per tab — UI/template logic only, calls into `db` and `app.js` but never touches `localStorage` or FSRS math directly). No modules, so load order is enforced by `<script>` tag order in `index.html`, not by imports — a later-loading file may use globals an earlier one defined, never the reverse. The one exception is `app.js`'s `DOMContentLoaded` handler (which calls `renderHome()`, defined in `js/pages/home.js`, loaded *after* `app.js`): that's safe because the handler body only runs once the `DOMContentLoaded` event fires, which happens after every `<script>` tag on the page — regardless of order — has already executed, so by then `renderHome()` exists. Prototype extension (`FlashcardDB.prototype.foo = function () {...}` in `stats-queries.js`/`demo-data.js`) is the vanilla-JS way to split one class's methods across files without modules — it must load after `storage.js` defines the class, but can load before or after `db` is instantiated, since prototype lookups happen at call time, not at object-creation time.

### `css/` — Base → Layout → Components → Pages

```
css/base.css            — design tokens (:root, incl. light-theme overrides), CSS reset, body/html base,
                           background orbs, shared keyframes (fadeUp/fadeIn/bounce/scaleIn).
css/layout.css           — structural regions: .app-container/.tab-pane, bottom nav (.bottom-nav/.tab-btn).
css/components.css       — reusable UI widgets used on ≥2 tabs: modal, toast, buttons (.btn-primary/
                            -secondary/-danger/-text), skeleton loading, .section-card/-header/-title/-badge,
                            .home-header/.greeting-text (shared by Home + Stats headers).
css/pages/home.css       — Home tab only.
css/pages/learn.css      — Learn tab only.
css/pages/stats.css      — Stats tab only.
css/pages/study.css      — Study session only.
css/pages/settings.css   — Settings tab only.
```

A selector belongs in `components.css` only if it's actually used on more than one tab (verify with `grep` across `js/pages/*.js`, not just by a generic-sounding name) — e.g. `.stat-card-v2` looks generic but is Stats-only today, so it lives in `css/pages/stats.css`; if a future change reuses it elsewhere, promote it to `components.css` then.

### `js/` — fsrs → storage → stats-queries/demo-data → app → pages

- **`js/fsrs.js`** — Pure FSRS-6 spaced-repetition logic. No DOM, no `localStorage`, no `db`, no render — takes a card state and a rating in, returns a new card state out. Models memory per card as `difficulty` (D, 1–10) and `stability` (S, days), from which `retrievability(elapsedDays, stability)` (the forgetting curve) is derived. Defines `RATING` constants (AGAIN/HARD/GOOD/EASY), `createCardState(wordId)`, `fsrs(card, rating, requestRetention?)` (the scheduler — returns a new immutable card state with updated `difficulty`, `stability`, `interval` (days, fractional during short learning/relearning steps), `reps`, `lapses`, `state` (`new`|`learning`|`review`|`relearning`), and `nextReview` timestamp), and `previewNextInterval(card, rating)` (non-mutating preview used for the rating-button labels in the UI, sharing its computation with `fsrs()` via the internal `_computeFSRS` helper). `FSRS_WEIGHTS` holds the 21 default trained weights (w0–w20); `REQUEST_RETENTION` (default 0.9) controls how far out reviews are scheduled. Cards saved before the FSRS-6 upgrade (missing `difficulty`/`stability`) are auto-migrated: `fsrs()` treats a card with `stability == null` as a first review regardless of its stored `state`. Has no dependency on anything else — loads first.
- **`js/storage.js`** — `FlashcardDB` class, instantiated once as the global singleton `db`. Wraps `localStorage` (key `flashcard_lite_db`) for persistence only: `_load`/`save`, card CRUD (`getCard`/`updateCard` — calls into `js/fsrs.js`'s `fsrs()`), settings (`get settings`/`updateSettings`), stats/streak (`get stats`/`recordStudySession`), and JSON export/import/reset. The stored `dailyReviewLimit` setting field is legacy/unused (no UI, no enforcement) — left in `_defaultData()` only so old exported/imported JSON backups still parse. Does **not** contain derived-stats queries or demo-data generation — see the two files below, which add methods onto `FlashcardDB.prototype` from outside the class body (the vanilla-JS way to split one class across files without modules). Loads after `js/fsrs.js`, before `js/stats-queries.js`/`js/demo-data.js`.
- **`js/stats-queries.js`** — Adds every derived-stats query used by the UI onto `FlashcardDB.prototype`: due-card selection (`getDueCards(topicId, topic)` — returns **every** matching learning/review/new card for that topic, unlimited; the `dailyNewCards` setting is **not** a hard cap anymore, it's only the target shown by the Home goal ring, read via `getDailyTodo()`'s `newGoal`/`newStartedToday`), `getTotalWordStats`, `getTopicProgress`, streaks/accuracy (`getAccuracyRate`), heatmap data (`getMonthlyActivity`), weak-word detection (`getWeakWords`), real FSRS retrievability prediction (`getFSRSPredictions`, using `js/fsrs.js`'s `retrievability()` against each card's actual `stability`/`lastReview`), and `getWeeklySummary`. Any query bucketing cards by state must account for all four FSRS states (`new`/`learning`/`review`/`relearning`) — it's easy to forget `relearning` (a card that lapsed after graduating) since it didn't exist before the FSRS-6 upgrade. Split out of `storage.js` because "add a new stat" is a different reason to change than "change how data is persisted." Loads right after `js/storage.js`.
- **`js/demo-data.js`** — Adds `isDemoActive()`/`enableDemoData()`/`disableDemoData()`/`_generateMockData()` onto `FlashcardDB.prototype` — generates and swaps in a fake "long-time user" dataset (streak, heatmap, weak words, due cards) for previewing the UI, backing up the real data to a separate `localStorage` key first and restoring it on disable. Entirely independent of real persistence logic — split out because "tweak the demo scenario" is a different reason to change than "change how data is persisted." Loads right after `js/stats-queries.js`.
- **`js/app.js`** — Small pieces shared by every page, plus app bootstrap: `currentTab`/`studySession` (mutable global UI state), `switchTab()` (activates a tab pane/nav button and calls that tab's render fn), `applyTheme()` (toggles the light/dark theme class on `<html>`/`<body>`), `showToast()` (floating notification, callable from any page), `loadTopicsDynamic()` (injects the 30 `data/*.js` `<script>` tags — the place to register new topic files), and the `DOMContentLoaded` handler (applies the saved theme, wires nav buttons, awaits `loadTopicsDynamic()`, then triggers the first render). A function belongs in the shared part only if it's genuinely cross-page (verified by actual call sites, not by how generic its name sounds) — e.g. `showToast` currently has all its call sites inside Settings, but it stays here because its CSS counterpart (`.toast`) is already a shared component and it's a general-purpose notification primitive, not Settings business logic. When in doubt, add a new helper inside the page file that needs it; promote it to `app.js` only once a second page actually needs it too. Loads after `js/storage.js`, before `js/pages/*.js`.
- **`js/pages/*.js`** — One file per tab/screen. Each contains **only that page's logic**: pure HTML-string template functions attached to the global `window.TEMPLATES` namespace (e.g. `TEMPLATES.studySession`, `TEMPLATES.learnList`, `TEMPLATES.settings`) plus the matching `render*()` function that injects the template into the DOM via `innerHTML`. No FSRS algorithm (call `js/fsrs.js`'s functions instead) and no direct `localStorage` access (go through `db`, from `js/storage.js`, instead). They read from `db` and `TOPICS` but don't mutate state directly (except via `js/app.js`'s `studySession`). Styling for each lives in the matching `css/pages/*.css` file (plus `css/components.css` for anything shared).
  - **`js/pages/home.js`** — `TEMPLATES.home` + `renderHome()`. Deliberately minimal/action-oriented: an animated SVG goal ring for today's new-word progress (`newStartedToday`/`newGoal` from `getDailyTodo()` — turns green with a ✓ once the goal is reached; the goal is informational only, never caps the actual study queue), due-today count, streak, "Bắt đầu học" CTA, overall progress bar, and a **top-3** topic preview (sorted by due-count desc, then by lowest progress — see the full 30-topic list in Learn). Does NOT read weak-word/FSRS/heatmap data — those queries live in `js/pages/stats.js` only, to keep Home's render cheap.
  - **`js/pages/stats.js`** — `TEMPLATES.stats` + `renderStats()` (called lazily, only when the Stats tab is opened). Everything analytical: streak + 7-day accuracy, FSRS memory forecast (current/7d/30d/90d retrievability), top-3 weakest words by lapse count, achievement badges, weekly summary, and the 30-day activity heatmap.
  - **`js/pages/learn.js`** — `TEMPLATES.learnList` + `renderLearnList()` + `openTopicStudy()` (builds the study queue and hands off into `js/pages/study.js` via `js/app.js`'s `studySession`).
  - **`js/pages/study.js`** — `TEMPLATES.studySession`/`finishScreen`/`noCardsScreen`, `flipCard()`/`rateCard()`, keyboard shortcuts (1–4, Space/Enter — study-only, so they live here rather than in `app.js`), text-to-speech (`speakWord()`). During an active study session, `document.body` gets a `study-focus` class (set by `setStudyFocusMode()`) which hides the bottom nav via CSS for a distraction-free flip-card view.
  - **`js/pages/settings.js`** — `TEMPLATES.settings` + `renderSettings()`, `saveSetting()`, demo-data toggle, export/import/reset.
- **`data/*.js`** (e.g. `finance_banking.js`, `toeic.js`) — Topic/vocabulary data files. Each is an IIFE that pushes one or more `{ id, name, icon, color, description, words: [...] }` objects onto `window.TOPICS`, guarded against double-registration. These are loaded dynamically at runtime (not via static `<script>` tags in `index.html`) by `loadTopicsDynamic()` in `js/app.js`, which is the place to register new topic files. Each script tag is created with `script.async = false` so the browser executes them in the order listed in `topicFiles` (still fetched in parallel) — without this, `window.TOPICS` order (and therefore the topic list the user sees) would depend on unpredictable network timing.

The app has 4 tabs, wired in `index.html` (`.tab-pane` + matching `.tab-btn[data-tab]`, switched by `switchTab()` in `js/app.js`): **Home** (quick-action dashboard: today's new-word goal ring/due-count/streak, overall progress, top-3 topic preview), **Stats** (deeper analytics: streak, accuracy, FSRS forecast, weak words, achievements, weekly summary, activity heatmap — split out from Home to keep it uncluttered), **Learn** (full topic list → study session), **Settings**.

### Data flow for a study session

1. `openTopicStudy(topicId)` (`js/pages/learn.js`) asks `db.getDueCards(topicId, topic)` for **every** card due now (priority: learning/relearning → review → new, unlimited — no daily cap), then `applyStudyOrder()` (`js/pages/study.js`) reorders the queue per the `studyOrder` setting (`due`|`random`|`alphabetical`), and writes the result into `js/app.js`'s `studySession`.
2. `studySession` holds the queue and progress (`totalDue` grows when a card is requeued after AGAIN, so the progress bar/counter stay accurate); `TEMPLATES.studySession` (`js/pages/study.js`) renders the current card, with rating-button time labels computed by `previewNextInterval()`.
3. `rateCard(rating)` (`js/pages/study.js`) calls `db.updateCard(wordId, rating)`, which runs `fsrs()` and persists to `localStorage`; `AGAIN` ratings requeue the card within the same session.
4. On completion, `db.recordStudySession()` updates streaks/daily logs, and `TEMPLATES.finishScreen` is rendered.

### Adding a new vocabulary topic

Create a new IIFE file under `data/` following the `finance_banking.js` pattern (unique `topic.id`, unique `word.id` prefixes), then add its path to the `topicFiles` array in `loadTopicsDynamic()` (`js/app.js`).

### Conventions

- All user-facing strings and code comments are in Vietnamese; keep new UI text consistent with this.
- No modules — new globals must be attached explicitly (e.g. `window.TEMPLATES.xxx = ...`, guarded with `if (!window.TEMPLATES) window.TEMPLATES = {}`). Top-level `function` declarations become `window.fnName` automatically; top-level `const`/`let`/`class` (e.g. `RATING`, `db`, `currentTab`) do **not** become `window.xxx` properties, but they're still readable/writable as bare identifiers from any other script file, since all non-module `<script>` tags share one global lexical scope. Don't be misled by a `typeof window.RATING === 'undefined'` check — test `typeof RATING` instead.
- `js/fsrs.js` functions are pure; keep storage/DOM concerns out of it and in `js/storage.js` / `js/pages/*.js` instead. `js/pages/*.js` files, in turn, hold UI/template logic only — no FSRS math, no direct `localStorage` access.
- Script load order in `index.html` is load-bearing: `js/fsrs.js` → `js/storage.js` → `js/stats-queries.js` → `js/demo-data.js` → `js/app.js` → `js/pages/*.js`. A file may use globals a prior file defined, never the reverse. When adding a new top-level `const`/`let`/`class`/`function`, check it isn't already declared elsewhere (`grep` across `js/`) — redeclaring the same top-level name in two loaded scripts throws a `SyntaxError`. New `FlashcardDB` methods go in `storage.js` if they read/write `localStorage` directly, `stats-queries.js` if they're a derived/computed query, or `demo-data.js` if they're demo-only — using `FlashcardDB.prototype.name = function () {...}` in the latter two, not `class` syntax.
- When adding a new screen/feature: create `js/pages/<name>.js` + `css/pages/<name>.css`, and add both a `<script>` and `<link>` tag to `index.html` in the right position (JS position matters for load order — after `js/app.js`; CSS position doesn't). Only touch `js/app.js`, `js/storage.js`, `js/fsrs.js`, or `css/components.css` for something genuinely reused across ≥2 pages — see the "verified by actual call sites" rule above.

## Git workflow

The user has authorized skipping manual review: after making a change, commit, push to the session's assigned branch, open/update the PR, and merge it immediately (no need to pause for confirmation before merging). Direct `git push` to `main` is not available in this session type — landing on `main` always goes through opening a PR on the assigned branch and merging it via the GitHub API.

## "Khung 3000 từ" vocabulary framework

Design target: 30 topics × 100 words (60 core / 25 intermediate / 15 advanced) = 3000 words. Status: **complete** — all 30 topic files under `data/` (see the `topicFiles` array in `loadTopicsDynamic()`, `js/app.js`) are registered and each has exactly 100 words, with 3000 globally-unique word IDs and no topic-ID collisions. `data/finance.js` (old 20-word version, superseded by `data/finance_banking.js`) and `data/toeic.js` (old TOEIC set) exist on disk but are deliberately left unregistered — see the comment right after the `topicFiles` array.
