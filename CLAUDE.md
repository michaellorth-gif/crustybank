# CLAUDE.md

This repo is **public** on GitHub, and GitHub Pages serves every file on the default branch at a public URL. Never commit client information, secrets, calendar feed URLs, API keys, or anything you would not post on the firm's website.

## What lives here

Two unrelated projects share this repo:

1. **Morth Calendar** — `index.html` at the root. Live at https://michaellorth-gif.github.io/crustybank/. Single file, inline CSS/JS, no build step. `HANDOFF.md` is the full reference; read it before changing the calendar.
2. **ClearFee Legal practice platform** — npm workspaces in `client/` (React 18, Vite, Tailwind, react-query, zustand), `server/` (Express, Drizzle + better-sqlite3, JWT auth, `docx`), and `shared/` (currently unused). Not yet deployed. Legal logic is in `server/src/lib/` (`legalTriage.ts`, `matterPipeline.ts`, `docgen.ts`, `conflicts.ts`); see `docs/automated-legal-workflows.md`.

Also: `.claude/skills/` (practice-area skills), `docs/marketing/` (brand guide and content drafts), `docs/legal/`, `docs/deployment.md`.

## Git

- There is no `main`. The default branch is `claude/review-changes-mkjchjoh36wunxib-83Zw2`, and GitHub Pages deploys from it. Work on a feature branch and merge by PR.
- Merging to the default branch publishes the calendar within about a minute, so do not merge calendar changes you have not checked.

## Calendar app (`index.html`)

- Calendar feed URLs (Outlook and iCloud ICS) are credentials. They are entered in the app and stored only in the browser's `localStorage`; never hardcode them, log them, or put them in examples.
- Never commit extra copies of the app (`index2.html`, `index (5).html`, etc.).
- Keep the `_renderCalendarBusy` guard and the debounced resize handler; removing them brings back a "Maximum call stack exceeded" crash.
- Mobile layout rule: the page never scrolls, only the active view does. The header and week strip stay inside `.calendar-area`; bottom padding includes `env(safe-area-inset-bottom)`.
- Event titles are currently inserted as raw HTML (known XSS issue). Any new code that renders calendar data must escape it.
- No automated tests. Verify changes in a browser at both phone width (iPhone Safari is the main target) and desktop.
- The CORS proxy is a Cloudflare Worker whose code lives only in the Cloudflare dashboard; it is not in this repo.

## Practice platform (`client/`, `server/`, `shared/`)

Run commands from the repo root:

- `npm install` (better-sqlite3 needs python3, make, g++ to build)
- `npm run db:setup --workspace=server` to create tables (`server/src/db/setup.ts` is the real schema setup; `db:migrate` and `db:seed` are broken)
- `npm run dev`: server on :5000 (tsx watch), Vite on :3000 proxying `/api`
- `npm run build` then `npm start`

Notes:

- There are no tests, and `npm run lint` fails because no ESLint config exists. Typecheck with `npm run build`. Say plainly when a change is unverified.
- Env vars: `DATABASE_PATH`, `JWT_SECRET`, `OPENAI_API_KEY`, `PORT`, `TRUST_PROXY`, `DISABLE_REGISTRATION` (template in `server/.env.example`). Never commit a `.env` or a database file. Do not put quotes around `DATABASE_PATH` values; that is how `server/"/data/app.db"` got committed.
- Known security debt to fix before any deploy: the JWT code falls back to the literal `'secret'` when `JWT_SECRET` is unset, and `cors()` is unrestricted.
- AI features still call OpenAI `gpt-3.5-turbo` (`server/src/routes/chat.ts`, `server/src/routes/emails.ts`).
- Deploy: Docker image to Railway or Render with a `/data` volume; see `docs/deployment.md`.

## Legal work

- Firm: **ClearFee Legal PLLC** (Texas, formation pending), sole member and responsible attorney **Michael L. Orth** ("Mike"), principal office Dallas. One firm, two fee tracks; there is no separate PI firm. (`HANDOFF.md` still says "Orth Injury Law"; that is out of date.)
- Texas law only. Practice-area workflows live in `.claude/skills/` (debt-defense, expunction, uncontested-divorce, estate-package, reduced-fee-mva). Demand letters for any PI matter use the `pi-demand-letter` skill.
- Every document is a draft. Nothing is filed, served, or sent without Mike's sign-off. Flag every assumption, and follow each skill's route-out and escalation rules.
- Never cite a statute, rule, case, or dollar figure without verifying it against current law in the same session. Cites marked ✓ in skill references were verified in August 2026; everything else needs a pinpoint check before filing.
- Court filings use Times New Roman 12.

## Marketing and client-facing text

Follow `docs/marketing/brand.md`. The rules that matter most:

- Spell it "ClearFee" (one word, capital C and F). Use "ClearFee Legal PLLC" in formal documents and "ClearFee Legal" in marketing; never "ClearFee" alone in a headline.
- Every external piece carries the compliance footer from `docs/marketing/content/_footer.md`.
- Texas advertising rules apply: never promise results, never say "best", "cheapest", "expert", or "specialist", and publish no fee Mike has not approved.
- Everything in `docs/marketing/` is a draft until Mike approves it.
