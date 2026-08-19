# KING BOT Platform

An Express + MongoDB service that serves the KING BOT marketing
site, the neural trading dashboard, an admin console, and a JSON API.
Authentication supports email/password and Sign in with Google.

The frontend is plain JavaScript served from `public/` and the server runs
from `dist/` — everything needed to run is committed, no build step.

## Stack

- **Server**: Express + Mongoose (`dist/server/`)
- **Client**: vanilla `<script>`-tag JavaScript, no framework or bundler (`public/js/`)
- JWT sessions, passwords hashed with bcrypt
- Google Identity Services on the frontend, verified server-side with
  `google-auth-library`
- MongoDB via Mongoose, with a resilient connection layer that never crashes
  the process if the database is unreachable

## Project structure

```
public/
  *.html                Marketing site, auth pages, dashboard, app pages
  admin/                 Admin-only login and dashboard pages
  legal/                 Privacy, terms, risk disclosure
  assets/                Neural brain logo and artwork (transparent PNG)
  styles.css              Shared styling for every page
  landing-cyber.css       Cinematic landing page styling and animations
  dashboard-cyber.css     Cyber HUD dashboard styling
  js/                     Client scripts (app shell, auth, dashboard, pages)
dist/server/              Server: Express routes, Mongoose models, auth utils
```

## Environment variables

Copy `.env.example` to `.env` for local development. Every variable below is
declared in both `render.yaml` and `app.json`.

| Variable               | Required | Purpose                                                        |
| ----------------------- | -------- | ---------------------------------------------------------------- |
| `PORT`                  | no       | Port the server listens on. Render sets this automatically.      |
| `HOST`                  | no       | Interface to bind to. Defaults to `0.0.0.0`.                     |
| `NODE_ENV`              | no       | `production` on Render.                                          |
| `APP_URL`                | no       | Public URL of the deployment (`https://gibsonfx.online`).        |
| `MONGODB_URI`            | yes      | MongoDB Atlas (or any Mongo) connection string.                  |
| `JWT_SECRET`             | yes      | Long random string used to sign session tokens.                  |
| `GOOGLE_CLIENT_ID`       | yes      | OAuth client ID from Google Cloud Console.                       |
| `GOOGLE_CLIENT_SECRET`   | yes      | OAuth client secret from Google Cloud Console.                   |
| `ADMIN_EMAIL`            | yes      | The only email allowed to log in to `/admin`. Defaults to `admin@gibsonfx.online`. |
| `ADMIN_PASSWORD`         | yes      | Password for that admin account. Defaults to `Admin@124#` — change this before going live. |

## Google OAuth setup for gibsonfx.online — step by step

This project uses **Google Identity Services** (the "Sign in with Google"
button that returns an ID token, verified server-side). It is **not** the
older redirect-based OAuth flow, which matters for two of your questions:

- **No webhook is needed anywhere in this setup.** Google doesn't call your
  server directly; your frontend gets a signed token from Google, sends it
  to `/api/auth/google`, and your server verifies it. There's no callback
  URL for Google to hit.
- **No Authorized redirect URI is required either** — only "Authorized
  JavaScript origins" (see step 5). If the console insists on a redirect URI
  before letting you save, add `https://gibsonfx.online/` as a harmless
  placeholder; it's never actually used by this flow.

Steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create (or select) a project — e.g. "King Bot".
2. Open **APIs & Services → OAuth consent screen**. Choose **External**,
   fill in an app name ("King Bot"), your support email, and a developer
   contact email, then save. The default scopes (`openid`, `email`,
   `profile`) are all you need.
3. Open **APIs & Services → Credentials → Create Credentials → OAuth client
   ID**.
4. Application type: **Web application**. Name it something like
   "King Bot Web".
5. Under **Authorized JavaScript origins**, add:
   - `https://gibsonfx.online` (your production domain)
   - `https://www.gibsonfx.online` (only if you also serve the `www` version)
   - `http://localhost:3000` (for local development)
   - Your Render `*.onrender.com` URL too, if you test there before the
     custom domain is fully wired up
6. Click **Create**. Copy the **Client ID** into `GOOGLE_CLIENT_ID` and the
   **Client secret** into `GOOGLE_CLIENT_SECRET`, both in your Render
   environment variables (and your local `.env`).
7. If your OAuth consent screen is still in "Testing" mode, only the test
   users you add under **Audience** can sign in with Google — switch it to
   "In production" once you're ready for the public, which for an app using
   only the basic `openid`/`email`/`profile` scopes does not require Google
   verification review.

### Domain to use

Use `https://gibsonfx.online` everywhere the app needs a public URL:
`APP_URL`, and the Google Authorized JavaScript origins above. Point
`gibsonfx.online`'s DNS at Render (Render's dashboard → your service →
**Settings → Custom Domains** will give you the exact CNAME/A record to add
at your domain registrar), then Render issues an SSL certificate for it
automatically.

### Getting a MongoDB connection string

Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas),
add a database user, allow network access from anywhere (or specifically
Render's IPs), and copy the connection string into `MONGODB_URI`.

## Run locally

```bash
npm install
npm start
```

Then visit `http://127.0.0.1:3000/`.

Run the test suite with:

```bash
npm test
```

## Deploying on Render

1. Push this repo to GitHub/GitLab.
2. In Render, choose **New → Blueprint** and point it at the repo. Render
   reads `render.yaml`, which sets the build command to
   `npm install` and the start command to `npm start`.
3. In the Render dashboard, fill in the environment variables marked
   `sync: false` in `render.yaml` (`APP_URL`, `MONGODB_URI`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`). `JWT_SECRET` is generated for you automatically.
4. Add your custom domain (`gibsonfx.online`) under the service's
   **Settings → Custom Domains**, and update your registrar's DNS as Render
   instructs.
5. Deploy. Render sets `PORT` automatically; the app already reads it.

`app.json` documents the same variables in the Heroku-style manifest format,
included for reference and for any tooling that reads that convention —
Render itself is driven by `render.yaml`.

## Admin dashboard

`/admin/login.html` is a separate login page that only accepts the account
whose email matches `ADMIN_EMAIL`. On first successful login (or on server
boot, once MongoDB is reachable), that admin account is created automatically
using `ADMIN_PASSWORD` — you don't need to seed it by hand.

- The admin session token is stored under a different localStorage key
  (`kingbotAdminToken`) than regular users (`kingbotToken`), so being logged
  in as a normal trader and as admin in the same browser never collide.
- Regular signup, login, and Google sign-in all explicitly reject
  `ADMIN_EMAIL` — nobody can register or sign in as the admin through the
  normal auth flows.
- `/admin/dashboard.html` shows live totals (users, bots, active bots, broker
  connections) and a recent-users table, pulled from `/api/admin/stats` and
  `/api/admin/users`, both guarded by a `requireAdmin` check server-side.
- Change `ADMIN_PASSWORD` away from the default before deploying anywhere
  public.

## Resilience and logging

- If `MONGODB_URI` is missing or MongoDB is unreachable, the server still
  starts and serves the marketing site; any API route that needs the
  database returns a clean `503 { "error": "Database is currently
  unavailable..." }` instead of crashing. It reconnects automatically once
  the database becomes reachable again.
- All route handlers are wrapped so thrown errors are caught and turned into
  a `500` JSON response instead of crashing the process; unexpected
  process-level errors are logged instead of taking the server down.
- Logs are single-line, timestamped, and leveled (`INFO` / `WARN` / `ERROR`)
  via the built-in logger — no raw stack traces or noisy framework
  output.

## VIP status

A user's `plan` field (`free`, `starter`, `professional`, `enterprise`)
drives a `planLabel` (`FREE`, `VIP`, `VIP ELITE`, `VIP ROYAL`) shown as a
gold pill next to their name in the topbar and dashboard hero, matching the
look of the reference design. Plans are changed from **Settings → Plan &
Billing**, which calls `/api/payment`.
