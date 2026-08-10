# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FlashCard Lite — a Vietnamese-language, single-page flashcard app for learning English vocabulary using the FSRS-6 (Free Spaced Repetition Scheduler v6) algorithm. Vanilla JS/HTML/CSS, no framework, no bundler, no build step, no package.json, no test suite.

Live deployment: https://trantien2k5.github.io/flashcard-lite/ (GitHub Pages, served directly from the `main` branch root — no build/CI step; pushing to `main` updates the live site).

## Running the app

There is no build/dev-server tooling in this repo. Since scripts are loaded via `<script src="...">` tags and topic data is fetched dynamically (`loadTopicsDynamic` in `js/main.js` injects `<script>` tags), opening `index.html` directly via `file://` will generally work, but serving over HTTP avoids any edge-case script-loading issues:

```
npx serve .
# or
python -m http.server
```

Then open the served URL. There is no lint or test command configured.

## Architecture

Everything runs client-side with global objects attached to `window`; there are no ES modules, no imports/exports. The project uses a flat, type-based folder layout (not nested per-component):

```
index.html
css/    — all stylesheets
js/     — all scripts
data/   — vocabulary topic data files
```

Script load order in `index.html` matters and encodes the dependency chain:

```
js/algorithm.js → js/db.js → js/Home.js, js/Learn.js, js/Study.js, js/Settings.js → js/main.js
```

Layers (also documented as header comments in each file, in Vietnamese):

- **`js/algorithm.js`** — Pure FSRS-6 spaced-repetition logic. Models memory per card as `difficulty` (D, 1–10) and `stability` (S, days), from which `retrievability(elapsedDays, stability)` (the forgetting curve) is derived. Defines `RATING` constants (AGAIN/HARD/GOOD/EASY), `createCardState(wordId)`, `fsrs(card, rating, requestRetention?)` (the scheduler — returns a new immutable card state with updated `difficulty`, `stability`, `interval` (days, fractional during short learning/relearning steps), `reps`, `lapses`, `state` (`new`|`learning`|`review`|`relearning`), and `nextReview` timestamp), and `previewNextInterval(card, rating)` (non-mutating preview used for the rating-button labels in the UI, sharing its computation with `fsrs()` via the internal `_computeFSRS` helper). No side effects, no DOM/storage access. `FSRS_WEIGHTS` holds the 21 default trained weights (w0–w20); `REQUEST_RETENTION` (default 0.9) controls how far out reviews are scheduled. Cards saved before the FSRS-6 upgrade (missing `difficulty`/`stability`) are auto-migrated: `fsrs()` treats a card with `stability == null` as a first review regardless of its stored `state`.
- **`js/db.js`** — `FlashcardDB` class, instantiated once as the global singleton `db`. Wraps `localStorage` (key `flashcard_lite_db`) for persistence of card states, settings, and stats. Calls into `algorithm.js`'s `fsrs()` inside `updateCard()`. Owns all derived-stats queries used by the UI: due-card selection (`getDueCards`, capped by both `dailyNewCards` and `dailyReviewLimit` settings), streaks, daily goals (`getDailyTodo`, `getDailyProgress`), accuracy, heatmap data (`getMonthlyActivity`), weak-word detection, real FSRS retrievability prediction (`getFSRSPredictions`, using `algorithm.js`'s `retrievability()` against each card's actual `stability`/`lastReview`), and JSON export/import/reset. Any query bucketing cards by state must account for all four FSRS states (`new`/`learning`/`review`/`relearning`) — it's easy to forget `relearning` (a card that lapsed after graduating) since it didn't exist before the FSRS-6 upgrade.
- **`data/*.js`** (e.g. `finance.js`, `toeic.js`) — Topic/vocabulary data files. Each is an IIFE that pushes one or more `{ id, name, icon, color, description, words: [...] }` objects onto `window.TOPICS`, guarded against double-registration. These are loaded dynamically at runtime (not via static `<script>` tags in `index.html`) by `loadTopicsDynamic()` in `js/main.js`, which is the place to register new topic files.
- **`js/Home.js`, `js/Learn.js`, `js/Study.js`, `js/Settings.js`** — View layer. Each defines pure HTML-string template functions attached to the global `window.TEMPLATES` namespace (e.g. `TEMPLATES.home`, `TEMPLATES.studySession`, `TEMPLATES.learnList`, `TEMPLATES.settings`). They read from `db` and `TOPICS` but don't mutate state; they return template strings that `main.js` injects into the DOM via `innerHTML`. Each has a matching stylesheet of the same name in `css/` (e.g. `css/Home.css`), both wired into `index.html`.
- **`js/main.js`** — Central controller. Owns UI state (`currentTab`, `studySession`), tab switching, event wiring (nav buttons, keyboard shortcuts for rating cards during study: `1`-`4` and Space/Enter to flip), orchestrates `db` + `TEMPLATES` to render each tab, and drives the study-session flow (`openTopicStudy` → `renderStudySession` → `flipCard`/`rateCard` → `finishStudySession`). Runs on `DOMContentLoaded`.

### Data flow for a study session

1. `openTopicStudy(topicId)` asks `db.getDueCards(topicId, topic)` for cards due now (priority: learning/relearning → review → new, capped by `dailyNewCards` and `dailyReviewLimit`), then `applyStudyOrder()` reorders the queue per the `studyOrder` setting (`due`|`random`|`alphabetical`).
2. Session state (`studySession`) holds the queue and progress (`totalDue` grows when a card is requeued after AGAIN, so the progress bar/counter stay accurate); `TEMPLATES.studySession` renders the current card, with rating-button time labels computed by `previewNextInterval()`.
3. `rateCard(rating)` calls `db.updateCard(wordId, rating)`, which runs `fsrs()` and persists to `localStorage`; `AGAIN` ratings requeue the card within the same session.
4. On completion, `db.recordStudySession()` updates streaks/daily logs, and `TEMPLATES.finishScreen` is rendered.

### Adding a new vocabulary topic

Create a new IIFE file under `data/` following the `finance.js` pattern (unique `topic.id`, unique `word.id` prefixes), then add its path to the `topicFiles` array in `loadTopicsDynamic()` in `js/main.js`.

### Conventions

- All user-facing strings and code comments are in Vietnamese; keep new UI text consistent with this.
- No modules — new globals must be attached explicitly (e.g. `window.TEMPLATES.xxx = ...`, guarded with `if (!window.TEMPLATES) window.TEMPLATES = {}`).
- `algorithm.js` functions are pure; keep storage/DOM concerns out of it and in `db.js`/components instead.
- Top-level `const`/`let` declared in one `<script>` file (e.g. `DAY`, `MINUTE`, `RATING` in `algorithm.js`) are visible to every script loaded after it on the page — this is how `db.js`/components reuse them — but it also means redeclaring the same name in a later-loaded file throws a `SyntaxError`. Check `algorithm.js`'s top-level names before adding new ones elsewhere.
