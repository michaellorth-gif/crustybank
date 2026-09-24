# Morth Calendar App — Project Handoff

**Built for:** Mike Orth, Orth Injury Law
**Date:** September 2026
**Status:** Live and operational

---

## What This Is

A personal unified calendar web app that pulls events from work Outlook, Apple Calendar, and Google Calendar into a single merged timeline. Includes notes/tasks with Google Sheets sync and color-coded event categories. Optimized for iPhone Safari and desktop Chrome.

---

## Live URLs

| Resource | URL |
|---|---|
| **Live app** | https://michaellorth-gif.github.io/crustybank/ |
| **GitHub repo** | https://github.com/michaellorth-gif/crustybank |
| **CORS proxy (Cloudflare Worker)** | https://morth-ics-proxy.michaellorth.workers.dev |

---

## Architecture

**Single HTML file** — all CSS and JavaScript inline, no build step, no dependencies to install. Hosted on GitHub Pages (free, no server needed).

```
Browser
  ↓
GitHub Pages (index.html)
  ↓ ICS feeds (Outlook, Apple)
Cloudflare Worker (CORS proxy)
  ↓ Google Calendar / Sheets API
Google Cloud (OAuth tokens)
```

**Why no server:** GitHub Pages is static hosting, which is free and zero-maintenance. The CORS proxy (Cloudflare Worker) is needed because browsers block direct fetches to Microsoft and Apple calendar servers. Cloudflare's free tier handles this without cost.

---

## Files

| File | Location | Purpose |
|---|---|---|
| `index.html` | Repo root, on the **default branch** (`claude/review-changes-…`) — there is no `main` branch; GitHub Pages deploys from the default branch | The entire app — one file |
| Worker code | Cloudflare dashboard | CORS proxy (see below) |

**Note:** this repo also holds unrelated projects (`client/`, `server/`, `docs/`, `Dockerfile`, etc.). The calendar app is only `index.html`. Do not commit extra copies of the app (`index2.html`, `index (5).html`) — GitHub Pages serves every file in the repo at a public URL.

**To edit the app:** Edit `index.html` on a branch and merge, or edit directly in GitHub's web editor on the default branch.

---

## Calendar Sources

### Outlook (Work Calendar)
- **Method:** ICS feed (read-only)
- **URL:** entered once in the app (Sources → Work Outlook) and stored only in that browser's `localStorage`. It is **not** in the source code. **Treat the URL as a password** — anyone who has it can read the whole calendar with no login.
- **Via proxy:** The app routes this through the Cloudflare Worker
- **If it stops working:** Outlook Web → Calendar → Share → ICS link. Each device needs the URL pasted once.

### Apple Calendar
- **Method:** ICS feed (read-only)
- **URL:** entered once in the app (Sources → Apple Calendar), stored only in `localStorage`, not in the source code. Same password-like handling as Outlook.
- **If it changes:** iCloud.com → Calendar → select calendar → Share → Copy Link

### Google Calendar
- **Method:** Google Calendar API v3 via OAuth
- **Access:** User-initiated — click "Connect Google" in the Sources tab
- **Token stored:** `sessionStorage` (lasts ~1 hour, requires reconnect per browser session)
- **Can create events:** **No** — not implemented. "+ Event" saves to this browser's `localStorage` only (see Known Issues).

---

## Google Cloud Project

| Setting | Value |
|---|---|
| **Project name** | (your project in Google Cloud Console) |
| **Client ID** | `711890035321-7nd2ij4lvgc15m7046372e3srtcccptl.apps.googleusercontent.com` |
| **Authorized JS origins** | `https://michaellorth-gif.github.io` |
| **Authorized redirect URIs** | `https://michaellorth-gif.github.io/crustybank/` |
| **APIs enabled** | Google Calendar API, Google Sheets API, Google Drive API |
| **Console URL** | https://console.cloud.google.com |

**If Google auth stops working:** Go to Cloud Console → Credentials → OAuth 2.0 Client IDs → check the authorized origins still match.

---

## Cloudflare Worker

**URL:** https://morth-ics-proxy.michaellorth.workers.dev
**Dashboard:** https://dash.cloudflare.com → Workers & Pages → morth-ics-proxy

**Worker code** (with an origin check so it is not an open proxy for anyone on the internet — paste this into the dashboard to replace the current version):
```javascript
const ALLOWED_ORIGINS = [
  'https://michaellorth-gif.github.io',
];
const ALLOWED_HOSTS = [
  'outlook.office365.com',
  'p126-caldav.icloud.com',
];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    if (!ALLOWED_ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403 });

    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) return new Response('Missing url parameter', { status: 400 });
    const fetchUrl = target.replace('webcal://', 'https://');
    let host;
    try { host = new URL(fetchUrl).hostname; } catch { return new Response('Bad url', { status: 400 }); }
    if (!ALLOWED_HOSTS.some(h => host === h || host.endsWith('.' + h.split('.').slice(-2).join('.')))) {
      return new Response('Host not allowed', { status: 403 });
    }

    try {
      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CalendarApp/1.0)',
          'Accept': 'text/calendar, text/plain, */*'
        }
      });
      const text = await response.text();
      return new Response(text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET',
          'Vary': 'Origin',
          'Cache-Control': 'no-cache'
        }
      });
    } catch(e) {
      return new Response('Fetch failed: ' + e.message, { status: 500 });
    }
  }
};
```

**Notes:**
- Content-Type must be `text/plain` (not `text/calendar`), otherwise the browser downloads the file instead of reading it.
- If the Apple feed host ever changes (e.g. `p126-caldav` → another number), the `endsWith('.icloud.com')` check still allows it. Add any new provider host to `ALLOWED_HOSTS`.
- The `Origin` header is sent by browsers on cross-origin fetches; a request from the app on GitHub Pages will pass. `curl` and other tools will get 403, which is the point.

---

## Google Sheets Sync (Notes & Tasks)

- **Sheet ID** stored in `localStorage` under key `morthSheetsId`
- **How to set up:** Connect Google → go to Notes tab → click "Set up cloud sync" → sheet auto-created in your Google Drive
- **Auto-saves** every 2 seconds after you stop typing
- **Manual save** button also available
- **Cross-device sync:** Works — same sheet read on any device when Google is connected

---

## Features

### Calendar Views
- **Agenda** (default on mobile) — merged timeline, next 60 days
- **Day** — hourly grid
- **Week** — 7-day hourly grid
- **Month** — grid overview

### Event Sources
- Outlook (work) — ICS, read-only
- Apple Calendar — ICS, read-only
- Google Calendar — API, read-only in practice (write not implemented)

### Event Display
- Start/end time block on left of agenda item
- Duration (e.g., "1h 30m") under title
- Location under title
- Color dot + source badge

### Color Categories
| Category | Color | Trigger |
|---|---|---|
| Work | Navy | Source = Outlook |
| Personal | Green | Source = Google, or manual |
| Apple Cal | Brown | Source = Apple |
| Court/Legal | Gold | Title contains: hearing, deposition, depo, mediation, arbitration, trial, court |
| Deadline | Red | Title contains: deadline, due, filing |
| Family | Blue | Manual category |
| Admin/Office | Gray | Manual category |

### Event Editing
- Tap any event → detail popup
- Edit / Delete only for events created in the app (`source: 'local'`); feed events are read-only
- "+" FAB (mobile) or "+ Event" (desktop) or press `n` to create a new event — saved to this browser only

### Notes & Tasks
- Scratch notes textarea (persists via Google Sheets or localStorage)
- Task list with checkboxes and schedule-to-calendar option
- Mobile: the Notes tab in the bottom nav opens the notes view (single-column on phones). A slide-up drawer (`openMobileTasks()`) exists in the code but is not wired to any button.

### Notifications
- The code schedules a 9pm daily / Sunday-weekly summary using the `new Notification()` API, which only works while the page is open in a desktop browser.
- **Does not work on iPhone.** iOS has no `new Notification()` support; notifications there require a Home Screen install plus a service worker and (for anything reliable) a Web Push server. Neither is built.
- Test on desktop: open browser console, type `testNotification()`

### Mobile (iPhone Safari)
- Add to Home Screen for app-like experience
- Bottom navigation bar (Day, Week, Agenda, Notes)
- Swipe left/right on the header or week strip to navigate
- Week strip visible in Day/Week views only
- FAB (+ button) centered at bottom
- Layout: the page never scrolls; the active view is the only vertical scroller. The mobile header and week strip live inside `.calendar-area` so they stay pinned. If content ever hides under the bottom nav again, check that this structure is intact and that the view's `padding-bottom` still includes `env(safe-area-inset-bottom)`.
- On resume (`visibilitychange`), the app refreshes "today" and re-syncs if the last sync is older than 5 minutes.

---

## LocalStorage Keys

| Key | Value |
|---|---|
| `outlookIcs` | Outlook ICS URL (sensitive) |
| `appleIcs` | Apple ICS URL (sensitive) |
| `morthSheetsId` | Google Sheets ID for notes |
| `morthData` | JSON: tasks, notes, local events |
| `lastNotif` | Date string of last notification sent |
| `notifPromptShown` | "1" once the notification banner has been shown |

---

## Known Issues & Quirks

1. **Google token expires ~1 hour** — user must click reconnect. A silent refresh via `requestAccessToken({prompt:''})` may work and hasn't been tried.
2. **Notifications don't work on iOS** and only work on desktop while the tab is open (see above).
3. **Apple and Outlook are read-only** — ICS feeds have no write path.
4. **"+ Event" does not write to Google Calendar** — events are stored in `localStorage` on the device where they were created and do not sync between phone and desktop.
5. **Recurring events from ICS feeds show only their first occurrence** — the parser ignores `RRULE`. Google is unaffected (`singleEvents=true`).
6. **UTC-stamped ICS times (`…Z`) are read as local time** — will be hours off if a feed uses them.
7. **Multi-day events appear only on their start day.** Google all-day events get an end of the following day 23:59 (API end date is exclusive).
8. **Event titles are inserted as raw HTML** — a malicious calendar invite title could run script in the page. Low likelihood; fix is an escape helper.

---

## How to Update the App

1. Go to https://github.com/michaellorth-gif/crustybank
2. Click `index.html`
3. Click the pencil (Edit) icon
4. Make changes
5. Click "Commit changes" (to the default branch, or to a branch and merge)
6. Wait ~60 seconds for GitHub Pages to redeploy
7. Hard refresh the app (Cmd+Shift+R on Mac, Ctrl+Shift+R on PC). On a Home Screen app, fully close and reopen it.

---

## If Something Breaks

**Events not loading:**
- Open browser console (F12 → Console)
- Look for red error messages
- If "CORS", "blocked" or "403" from the worker → check the Cloudflare Worker is active and that the app's origin is in `ALLOWED_ORIGINS`
- If "401" or "403" from Google → reconnect Google in the Sources tab
- If Outlook/Apple show "not connected" on a device → paste the feed URL in Sources on that device

**"Maximum call stack exceeded" error:**
- Means `renderCalendar` is being called recursively
- Guarded by `_renderCalendarBusy` and a debounced resize handler; confirm both are still there

**Google won't connect:**
- Check that https://michaellorth-gif.github.io is in the authorized JavaScript origins in Google Cloud Console
- Check that Google Calendar API, Sheets API, and Drive API are all enabled

**Notes not syncing across devices:**
- Both devices must have Google connected
- The `morthSheetsId` value must match on both devices — set up sync on one, then paste the ID on the other (or set up on each and share the sheet)

---

## Security notes

- The two ICS feed URLs were previously hardcoded in `index.html` (and in `index2.html` / `index (5).html`) in this public repo, and remain in git history. Both feeds should be **regenerated** at the source (Outlook Web → Calendar → Share; iCloud → Calendar → Share) so the leaked URLs stop working, then pasted into the app on each device.
- The Cloudflare Worker was an open proxy; the version above restricts it to the app's origin and known calendar hosts. Deploy it from the Cloudflare dashboard.

---

## Contacts / Accounts

- **GitHub:** michaellorth-gif (michaellorth-gif.github.io)
- **Google Cloud:** michaellorth@gmail.com
- **Cloudflare:** (same Gmail account)

---

## Future Ideas (Not Yet Built)

- Write new events to Google Calendar (the OAuth scope already covers it)
- RRULE expansion for ICS feeds
- Offline / PWA with a service worker (GitHub Pages supports this; it's HTTPS and `sw.js` at the repo root registers fine)
- Real notifications on iPhone via Web Push (needs a small push server — a Cloudflare Worker with a cron trigger could do it)
- Two-way Outlook sync (needs Azure app registration — blocked by firm IT)
- Event search/filter
