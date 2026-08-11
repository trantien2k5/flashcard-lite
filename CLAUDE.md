# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FlashCard Lite — a Vietnamese-language, single-page flashcard app for learning English vocabulary using the FSRS-6 (Free Spaced Repetition Scheduler v6) algorithm. Vanilla JS/HTML/CSS, no framework, no bundler, no build step, no package.json, no test suite.

Live deployment: https://trantien2k5.github.io/flashcard-lite/ (GitHub Pages, served directly from the `main` branch root — no build/CI step; pushing to `main` updates the live site).

## Running the app

There is no build/dev-server tooling in this repo. Since scripts are loaded via `<script src="...">` tags and topic data is fetched dynamically (`loadTopicsDynamic` in `app.js` injects `<script>` tags), opening `index.html` directly via `file://` will generally work, but serving over HTTP avoids any edge-case script-loading issues:

```
npx serve .
# or
python -m http.server
```

Then open the served URL. There is no lint or test command configured.

## Architecture

Everything runs client-side with global objects attached to `window`; there are no ES modules, no imports/exports. The project is 3 top-level files/folders:

```
index.html
style.css — all styles, single file, divided into numbered "PHẦN" (section) blocks in Vietnamese comments (tokens → shared components → nav → Home → Stats → Learn → Study → Settings); search "PHẦN <n>" to jump to a section
app.js     — all scripts, single file, same "PHẦN" convention as style.css (see below)
data/      — vocabulary topic data files (still one file per topic-group, loaded dynamically — see below); the only subfolder in the project
```

`app.js` concatenates what used to be separate script files, in dependency order, as 8 numbered "PHẦN" blocks (search `PHẦN <n>` to jump to one) — order matters because there are no modules, so a later PHẦN can reference globals a prior PHẦN defined, but not the reverse:

```
PHẦN 1 algorithm → PHẦN 2 db → PHẦN 3 Home, PHẦN 4 Stats, PHẦN 5 Learn, PHẦN 6 Study, PHẦN 7 Settings → PHẦN 8 main
```

The app has 4 tabs, wired in `index.html` (`.tab-pane` + matching `.tab-btn[data-tab]`, switched by `switchTab()` in PHẦN 8): **Home** (quick-action dashboard: today's to-do, overall progress, topic list), **Stats** (deeper analytics: streak, accuracy, FSRS forecast, weak words, achievements, weekly summary, activity heatmap — split out from Home to keep it uncluttered), **Learn** (topic list → study session), **Settings**.

Layers (also documented as a header comment at the start of each PHẦN, in Vietnamese):

- **PHẦN 1 (algorithm)** — Pure FSRS-6 spaced-repetition logic. Models memory per card as `difficulty` (D, 1–10) and `stability` (S, days), from which `retrievability(elapsedDays, stability)` (the forgetting curve) is derived. Defines `RATING` constants (AGAIN/HARD/GOOD/EASY), `createCardState(wordId)`, `fsrs(card, rating, requestRetention?)` (the scheduler — returns a new immutable card state with updated `difficulty`, `stability`, `interval` (days, fractional during short learning/relearning steps), `reps`, `lapses`, `state` (`new`|`learning`|`review`|`relearning`), and `nextReview` timestamp), and `previewNextInterval(card, rating)` (non-mutating preview used for the rating-button labels in the UI, sharing its computation with `fsrs()` via the internal `_computeFSRS` helper). No side effects, no DOM/storage access. `FSRS_WEIGHTS` holds the 21 default trained weights (w0–w20); `REQUEST_RETENTION` (default 0.9) controls how far out reviews are scheduled. Cards saved before the FSRS-6 upgrade (missing `difficulty`/`stability`) are auto-migrated: `fsrs()` treats a card with `stability == null` as a first review regardless of its stored `state`.
- **PHẦN 2 (db)** — `FlashcardDB` class, instantiated once as the global singleton `db`. Wraps `localStorage` (key `flashcard_lite_db`) for persistence of card states, settings, and stats. Calls into PHẦN 1's `fsrs()` inside `updateCard()`. Owns all derived-stats queries used by the UI: due-card selection (`getDueCards`, capped by both `dailyNewCards` and `dailyReviewLimit` settings), streaks, daily goals (`getDailyTodo`, `getDailyProgress`), accuracy, heatmap data (`getMonthlyActivity`), weak-word detection, real FSRS retrievability prediction (`getFSRSPredictions`, using PHẦN 1's `retrievability()` against each card's actual `stability`/`lastReview`), and JSON export/import/reset. Any query bucketing cards by state must account for all four FSRS states (`new`/`learning`/`review`/`relearning`) — it's easy to forget `relearning` (a card that lapsed after graduating) since it didn't exist before the FSRS-6 upgrade.
- **`data/*.js`** (e.g. `finance.js`, `toeic.js`) — Topic/vocabulary data files. Each is an IIFE that pushes one or more `{ id, name, icon, color, description, words: [...] }` objects onto `window.TOPICS`, guarded against double-registration. These are loaded dynamically at runtime (not via static `<script>` tags in `index.html`) by `loadTopicsDynamic()` in PHẦN 8, which is the place to register new topic files.
- **PHẦN 3 (Home)** — `TEMPLATES.home`, rendered by `renderHome()`. Deliberately minimal/action-oriented: today's due/new counts + "Bắt đầu học" CTA, overall progress bar, topic overview list. Does NOT read weak-word/FSRS/heatmap data — those queries live in PHẦN 4 only, to keep Home's render cheap.
- **PHẦN 4 (Stats)** — `TEMPLATES.stats`, rendered by `renderStats()` (called lazily, only when the Stats tab is opened). Everything analytical: streak + 7-day accuracy, FSRS memory forecast (current/7d/30d/90d retrievability), top-3 weakest words by lapse count, achievement badges, weekly summary, and the 30-day activity heatmap.
- **PHẦN 5–7 (Learn, Study, Settings)** — View layer. Each defines pure HTML-string template functions attached to the global `window.TEMPLATES` namespace (e.g. `TEMPLATES.studySession`, `TEMPLATES.learnList`, `TEMPLATES.settings`). They read from `db` and `TOPICS` but don't mutate state; they return template strings that PHẦN 8 injects into the DOM via `innerHTML`. Styling for each lives in its matching numbered "PHẦN" section inside `style.css`. During an active study session, `document.body` gets a `study-focus` class (set by `setStudyFocusMode()` in PHẦN 6) which hides the bottom nav via CSS for a distraction-free flip-card view.
- **PHẦN 8 (main)** — Central controller. Owns UI state (`currentTab`, `studySession`), tab switching (`switchTab()`, generic over any `.tab-pane`/`.tab-btn[data-tab]` pair — adding a 5th tab needs no changes here), event wiring (nav buttons, keyboard shortcuts for rating cards during study: `1`-`4` and Space/Enter to flip), orchestrates `db` + `TEMPLATES` to render each tab, and drives the study-session flow (`openTopicStudy` → `renderStudySession` → `flipCard`/`rateCard` → `finishStudySession`). Runs on `DOMContentLoaded`.

### Data flow for a study session

1. `openTopicStudy(topicId)` asks `db.getDueCards(topicId, topic)` for cards due now (priority: learning/relearning → review → new, capped by `dailyNewCards` and `dailyReviewLimit`), then `applyStudyOrder()` reorders the queue per the `studyOrder` setting (`due`|`random`|`alphabetical`).
2. Session state (`studySession`) holds the queue and progress (`totalDue` grows when a card is requeued after AGAIN, so the progress bar/counter stay accurate); `TEMPLATES.studySession` renders the current card, with rating-button time labels computed by `previewNextInterval()`.
3. `rateCard(rating)` calls `db.updateCard(wordId, rating)`, which runs `fsrs()` and persists to `localStorage`; `AGAIN` ratings requeue the card within the same session.
4. On completion, `db.recordStudySession()` updates streaks/daily logs, and `TEMPLATES.finishScreen` is rendered.

### Adding a new vocabulary topic

Create a new IIFE file under `data/` following the `finance.js` pattern (unique `topic.id`, unique `word.id` prefixes), then add its path to the `topicFiles` array in `loadTopicsDynamic()` (PHẦN 8 of `app.js`).

### Conventions

- All user-facing strings and code comments are in Vietnamese; keep new UI text consistent with this.
- No modules — new globals must be attached explicitly (e.g. `window.TEMPLATES.xxx = ...`, guarded with `if (!window.TEMPLATES) window.TEMPLATES = {}`).
- PHẦN 1 (algorithm) functions are pure; keep storage/DOM concerns out of it and in PHẦN 2 (db) / the view PHẦNs instead.
- `app.js` is one file with no modules, so top-level `const`/`let` (e.g. `DAY`, `MINUTE`, `RATING` from PHẦN 1) are visible everywhere below their declaration — this is how PHẦN 2+ reuse them — but redeclaring the same name in a later PHẦN throws a `SyntaxError`. Check existing top-level names (`Ctrl+F` in `app.js`) before adding new ones. When editing, preserve the PHẦN order (1→8); moving code across PHẦNs can break this dependency chain.
- `style.css` and `app.js` are each intentionally a single merged file (not per-component files) — when adding a new screen/feature, append a new numbered PHẦN block (or extend an existing one) rather than creating a separate file, to keep the "1 file per concern" structure intact.

## Git workflow

The user has authorized skipping manual review: after making a change, commit, push to the session's assigned branch, open/update the PR, and merge it immediately (no need to pause for confirmation before merging). Direct `git push` to `main` is not available in this session type — landing on `main` always goes through opening a PR on the assigned branch and merging it via the GitHub API.

## "Khung 3000 từ" vocabulary framework

Design target: 30 topics × 100 words (60 core / 25 intermediate / 15 advanced) = 3000 words. Status: **complete** — all 30 topic files under `data/` (see the `topicFiles` array in `loadTopicsDynamic()`, PHẦN 8 of `app.js`) are registered and each has exactly 100 words, with 3000 globally-unique word IDs and no topic-ID collisions. `data/finance.js` (old 20-word version, superseded by `data/finance_banking.js`) and `data/toeic.js` (old TOEIC set) exist on disk but are deliberately left unregistered — see the comment right after the `topicFiles` array.
