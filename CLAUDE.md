# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FlashCard Lite — a Vietnamese-language, single-page flashcard app for learning English vocabulary using the FSRS-6 (Free Spaced Repetition Scheduler v6) algorithm. Vanilla JS/HTML/CSS, no framework, no bundler, no build step, no package.json, no test suite.

Live deployment: https://trantien2k5.github.io/flashcard-lite/ (GitHub Pages, served directly from the `main` branch root — no build/CI step; pushing to `main` updates the live site).

## Running the app

There is no build/dev-server tooling in this repo. Since scripts are loaded via `<script src="...">` tags and topic data is fetched dynamically (`loadTopicsDynamic` in `js/bootstrap.js` injects `<script>` tags), opening `index.html` directly via `file://` will generally work, but serving over HTTP avoids any edge-case script-loading issues:

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
css/       — styles, split by architectural layer (Base → Layout → Components → Pages)
js/        — scripts, split by feature (core → store → shared → features → bootstrap)
data/      — vocabulary topic data files (one file per topic-group, loaded dynamically)
```

Both `css/` and `js/` are split by responsibility, not by tab-in-isolation, so genuinely shared code lives in exactly one place instead of being duplicated per screen. Files are wired into `index.html` via multiple `<link>`/`<script>` tags; **load order matters for `js/`** (no modules, so a later file can use globals an earlier file defined, never the reverse) but not for `css/` (the cascade + higher-specificity light-theme selectors make order mostly irrelevant there).

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

A selector belongs in `components.css` only if it's actually used on more than one tab (verify with `grep` across `js/features/**`, not just by a generic-sounding name) — e.g. `.stat-card-v2` looks generic but is Stats-only today, so it lives in `css/pages/stats.css`; if a future change reuses it elsewhere, promote it to `components.css` then.

### `js/` — core → store → shared → features → bootstrap

```
js/core/fsrs.js              — pure FSRS-6 algorithm (no DOM/storage). RATING/DAY/MINUTE constants,
                                createCardState, fsrs(), previewNextInterval(), retrievability(). No
                                dependency on any other JS file — everything else depends on this.
js/core/state.js             — currentTab, studySession (mutable global UI state, read/written by
                                multiple features — loaded early so any feature can reference it).
js/core/navigation.js        — switchTab(): activates a tab pane/nav button and calls that tab's render fn.
js/core/theme.js             — applyTheme(): toggles the light/dark theme class on <html>/<body>.
js/store/flashcard-db.js     — FlashcardDB class + the `db` singleton. Reads/writes localStorage, calls
                                core/fsrs.js's fsrs() when scoring a card, owns every derived-stats query.
js/shared/toast.js           — showToast(): floating notification, callable from any feature.
js/features/home/home.js     — Home tab: TEMPLATES.home + renderHome() + its helpers (getGreeting,
                                formatMinutes).
js/features/stats/stats.js   — Stats tab: TEMPLATES.stats + renderStats().
js/features/learn/learn.js   — Learn tab: TEMPLATES.learnList + renderLearnList() + openTopicStudy()
                                (builds the study queue and hands off into the Study feature via
                                core/state.js's `studySession`).
js/features/study/study.js   — Study session: TEMPLATES.studySession/finishScreen/noCardsScreen,
                                flipCard()/rateCard(), keyboard shortcuts (1–4, Space/Enter — study-only,
                                so they live here rather than in bootstrap), text-to-speech (speakWord()).
js/features/settings/settings.js — Settings tab: TEMPLATES.settings + renderSettings(), saveSetting(),
                                demo-data toggle, export/import/reset.
js/bootstrap.js               — true app entry point: loadTopicsDynamic() (injects the 30 `data/*.js`
                                <script> tags) and the DOMContentLoaded handler that wires nav buttons and
                                triggers the first render. Loads LAST — needs every function/global above
                                to already exist.
```

A function belongs in `core/` or `shared/` only if it's genuinely cross-feature (verified by actual call sites, not by how generic its name sounds) — e.g. `showToast` currently has all its call sites inside Settings, but it stays in `shared/` because its CSS counterpart (`.toast`) is already a shared component and it's a general-purpose notification primitive, not Settings business logic. When in doubt, start a new helper inside the feature that needs it; promote it to `shared/`/`core/` only once a second feature actually needs it too.

The app has 4 tabs, wired in `index.html` (`.tab-pane` + matching `.tab-btn[data-tab]`, switched by `switchTab()` in `js/core/navigation.js`): **Home** (quick-action dashboard: today's new-word goal ring/due-count/streak, overall progress, top-3 topic preview), **Stats** (deeper analytics: streak, accuracy, FSRS forecast, weak words, achievements, weekly summary, activity heatmap — split out from Home to keep it uncluttered), **Learn** (full topic list → study session), **Settings**.

- **`js/core/fsrs.js`** — Pure FSRS-6 spaced-repetition logic. Models memory per card as `difficulty` (D, 1–10) and `stability` (S, days), from which `retrievability(elapsedDays, stability)` (the forgetting curve) is derived. Defines `RATING` constants (AGAIN/HARD/GOOD/EASY), `createCardState(wordId)`, `fsrs(card, rating, requestRetention?)` (the scheduler — returns a new immutable card state with updated `difficulty`, `stability`, `interval` (days, fractional during short learning/relearning steps), `reps`, `lapses`, `state` (`new`|`learning`|`review`|`relearning`), and `nextReview` timestamp), and `previewNextInterval(card, rating)` (non-mutating preview used for the rating-button labels in the UI, sharing its computation with `fsrs()` via the internal `_computeFSRS` helper). No side effects, no DOM/storage access. `FSRS_WEIGHTS` holds the 21 default trained weights (w0–w20); `REQUEST_RETENTION` (default 0.9) controls how far out reviews are scheduled. Cards saved before the FSRS-6 upgrade (missing `difficulty`/`stability`) are auto-migrated: `fsrs()` treats a card with `stability == null` as a first review regardless of its stored `state`.
- **`js/store/flashcard-db.js`** — `FlashcardDB` class, instantiated once as the global singleton `db`. Wraps `localStorage` (key `flashcard_lite_db`) for persistence of card states, settings, and stats. Calls into `core/fsrs.js`'s `fsrs()` inside `updateCard()`. Owns all derived-stats queries used by the UI: due-card selection (`getDueCards(topicId, topic)` — returns **every** matching learning/review/new card for that topic, unlimited; the `dailyNewCards` setting is **not** a hard cap anymore, it's only the target shown by the Home goal ring, read via `getDailyTodo()`'s `newGoal`/`newStartedToday`), streaks, accuracy, heatmap data (`getMonthlyActivity`), weak-word detection, real FSRS retrievability prediction (`getFSRSPredictions`, using `core/fsrs.js`'s `retrievability()` against each card's actual `stability`/`lastReview`), and JSON export/import/reset. Any query bucketing cards by state must account for all four FSRS states (`new`/`learning`/`review`/`relearning`) — it's easy to forget `relearning` (a card that lapsed after graduating) since it didn't exist before the FSRS-6 upgrade. The stored `dailyReviewLimit` setting field is legacy/unused (no UI, no enforcement) — left in `_defaultData()` only so old exported/imported JSON backups still parse.
- **`data/*.js`** (e.g. `finance_banking.js`, `toeic.js`) — Topic/vocabulary data files. Each is an IIFE that pushes one or more `{ id, name, icon, color, description, words: [...] }` objects onto `window.TOPICS`, guarded against double-registration. These are loaded dynamically at runtime (not via static `<script>` tags in `index.html`) by `loadTopicsDynamic()` in `js/bootstrap.js`, which is the place to register new topic files. Each script tag is created with `script.async = false` so the browser executes them in the order listed in `topicFiles` (still fetched in parallel) — without this, `window.TOPICS` order (and therefore the topic list the user sees) would depend on unpredictable network timing.
- **`js/features/home/home.js`** — `TEMPLATES.home`, rendered by `renderHome()`. Deliberately minimal/action-oriented: an animated SVG goal ring for today's new-word progress (`newStartedToday`/`newGoal` from `getDailyTodo()` — turns green with a ✓ once the goal is reached; the goal is informational only, never caps the actual study queue), due-today count, streak, "Bắt đầu học" CTA, overall progress bar, and a **top-3** topic preview (sorted by due-count desc, then by lowest progress — see the full 30-topic list in Learn). Does NOT read weak-word/FSRS/heatmap data — those queries live in `features/stats/stats.js` only, to keep Home's render cheap.
- **`js/features/stats/stats.js`** — `TEMPLATES.stats`, rendered by `renderStats()` (called lazily, only when the Stats tab is opened). Everything analytical: streak + 7-day accuracy, FSRS memory forecast (current/7d/30d/90d retrievability), top-3 weakest words by lapse count, achievement badges, weekly summary, and the 30-day activity heatmap.
- **`js/features/learn/learn.js`, `js/features/study/study.js`, `js/features/settings/settings.js`** — View layer. Each defines pure HTML-string template functions attached to the global `window.TEMPLATES` namespace (e.g. `TEMPLATES.studySession`, `TEMPLATES.learnList`, `TEMPLATES.settings`). They read from `db` and `TOPICS` but don't mutate state directly (except via `core/state.js`'s `studySession`); they return template strings that the corresponding `render*()` function injects into the DOM via `innerHTML`. Styling for each lives in the matching `css/pages/*.css` file (plus `css/components.css` for anything shared). During an active study session, `document.body` gets a `study-focus` class (set by `setStudyFocusMode()` in `study.js`) which hides the bottom nav via CSS for a distraction-free flip-card view.
- **`js/bootstrap.js`** — Loads dynamic topic data (`loadTopicsDynamic()`) and wires up nav buttons + the initial render on `DOMContentLoaded`. Tab-switching (`switchTab()`) and per-feature state (`currentTab`, `studySession`) live in `js/core/` instead, since those are referenced by features directly, not only by bootstrap.

### Data flow for a study session

1. `openTopicStudy(topicId)` (in `learn.js`) asks `db.getDueCards(topicId, topic)` for **every** card due now (priority: learning/relearning → review → new, unlimited — no daily cap), then `applyStudyOrder()` (in `study.js`) reorders the queue per the `studyOrder` setting (`due`|`random`|`alphabetical`), and writes the result into `core/state.js`'s `studySession`.
2. `studySession` holds the queue and progress (`totalDue` grows when a card is requeued after AGAIN, so the progress bar/counter stay accurate); `TEMPLATES.studySession` (in `study.js`) renders the current card, with rating-button time labels computed by `previewNextInterval()`.
3. `rateCard(rating)` (in `study.js`) calls `db.updateCard(wordId, rating)`, which runs `fsrs()` and persists to `localStorage`; `AGAIN` ratings requeue the card within the same session.
4. On completion, `db.recordStudySession()` updates streaks/daily logs, and `TEMPLATES.finishScreen` is rendered.

### Adding a new vocabulary topic

Create a new IIFE file under `data/` following the `finance_banking.js` pattern (unique `topic.id`, unique `word.id` prefixes), then add its path to the `topicFiles` array in `loadTopicsDynamic()` (`js/bootstrap.js`).

### Conventions

- All user-facing strings and code comments are in Vietnamese; keep new UI text consistent with this.
- No modules — new globals must be attached explicitly (e.g. `window.TEMPLATES.xxx = ...`, guarded with `if (!window.TEMPLATES) window.TEMPLATES = {}`). Top-level `function` declarations become `window.fnName` automatically; top-level `const`/`let`/`class` (e.g. `RATING`, `db`, `currentTab`) do **not** become `window.xxx` properties, but they're still readable/writable as bare identifiers from any other script file, since all non-module `<script>` tags share one global lexical scope. Don't be misled by a `typeof window.RATING === 'undefined'` check — test `typeof RATING` instead.
- `js/core/fsrs.js` functions are pure; keep storage/DOM concerns out of it and in `js/store/` / the feature files instead.
- Script load order in `index.html` is load-bearing: `js/core/*` → `js/store/*` → `js/shared/*` → `js/features/**` → `js/bootstrap.js`. A file may use globals a prior file defined, never the reverse. When adding a new top-level `const`/`let`/`class`/`function`, check it isn't already declared elsewhere (`grep` across `js/`) — redeclaring the same top-level name in two loaded scripts throws a `SyntaxError`.
- When adding a new screen/feature: create `js/features/<name>/<name>.js` + `css/pages/<name>.css`, and add both a `<script>` and `<link>` tag to `index.html` in the right position (JS position matters for load order; CSS position doesn't). Only touch `js/core/`, `js/shared/`, or `css/components.css` for something genuinely reused across ≥2 features — see the "verified by actual call sites" rule above.

## Git workflow

The user has authorized skipping manual review: after making a change, commit, push to the session's assigned branch, open/update the PR, and merge it immediately (no need to pause for confirmation before merging). Direct `git push` to `main` is not available in this session type — landing on `main` always goes through opening a PR on the assigned branch and merging it via the GitHub API.

## "Khung 3000 từ" vocabulary framework

Design target: 30 topics × 100 words (60 core / 25 intermediate / 15 advanced) = 3000 words. Status: **complete** — all 30 topic files under `data/` (see the `topicFiles` array in `loadTopicsDynamic()`, `js/bootstrap.js`) are registered and each has exactly 100 words, with 3000 globally-unique word IDs and no topic-ID collisions. `data/finance.js` (old 20-word version, superseded by `data/finance_banking.js`) and `data/toeic.js` (old TOEIC set) exist on disk but are deliberately left unregistered — see the comment right after the `topicFiles` array.
