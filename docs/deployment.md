# Deploying the Practice App

One Docker container serves everything — the web app, the API, and the public
intake portal. The database is SQLite on a persistent disk, so the host must
provide a volume (client data must survive restarts and redeploys).

## Option A — Railway (simplest)

1. Create an account at railway.app (GitHub sign-in) and add a payment method
   (expect roughly $5–10/month for this app).
2. **New Project → Deploy from GitHub repo** → pick `crustybank`. Railway reads
   `railway.json` and builds the Dockerfile automatically.
3. In the service settings, add a **Volume** mounted at `/data`.
4. Set **Variables**:
   - `JWT_SECRET` — long random string (Railway can generate one; never reuse a
     password)
   - `TRUST_PROXY` = `1`
   - `DATABASE_PATH` = `/data/app.db`
   - `OPENAI_API_KEY` — only if the AI chat page should work; leave unset otherwise
5. Deploy. Railway assigns a URL like `crustybank-production.up.railway.app`
   (Settings → Networking → Generate Domain if it hasn't).
6. **Immediately** complete the post-deploy checklist below.

Every merge to the default branch auto-deploys from then on.

## Option B — Render

1. Create an account at render.com and go to **Blueprints → New Blueprint
   Instance**, pick this repo. Render reads `render.yaml`, which defines the
   service, the 1 GB disk at `/data`, and the environment variables (it
   generates `JWT_SECRET` itself).
2. Use at least the **Starter** plan — Render's free tier has no persistent
   disk, which means the database (client data!) would vanish on every deploy.
3. Deploy, then complete the post-deploy checklist.

## Post-deploy checklist (do this the first time, in order)

1. Open the app URL → **Register** → create YOUR account first. The first
   account created becomes the admin.
2. Create accounts for staff, if any.
3. Set the environment variable `DISABLE_REGISTRATION=true` and redeploy /
   restart. Public signup is now closed; the public intake portal at
   `https://<your-url>/intake` still works — it never required an account.
4. In the app: Legal Intakes → gear icon → fill in **Firm Settings** (signature
   blocks for generated documents).
5. Run one fake client through each intake form; generate and read each
   document; delete the test intakes.
6. Only after that, consider linking `https://<your-url>/intake` from the firm
   website (and run the ad/communications past State Bar Advertising Review).

## Custom domain

Both hosts support custom domains (e.g. `intake.yourfirm.com`): add the domain
in the host's settings and create the DNS record they show you at your domain
registrar. HTTPS certificates are automatic.

## Backups

The SQLite file at `/data/app.db` is the entire database. Railway volumes and
Render disks persist but are not automatic offsite backups — periodically
download a copy (both hosts offer shell/snapshot access) or schedule an export.
Client matter data deserves the same care as the paper file.

## Notes for whoever maintains this

- `Dockerfile` boots via `node server/dist/db/setup.js && node server/dist/index.js`;
  setup is additive (CREATE TABLE IF NOT EXISTS + column migrations) and safe to
  run on every boot.
- `TRUST_PROXY` makes Express honor `X-Forwarded-For` (one hop) so the public
  intake rate limiter sees real client IPs. Never set it when the app is
  reached directly with no proxy in front.
- Health check endpoint: `GET /api/health`.
