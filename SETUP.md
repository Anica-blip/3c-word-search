# 3C Word Search — SETUP.md

> _Complete setup reference for the 3C Word Search Game._  
> Designed and Built with ❤ by Claude (Anthropic) × Chef Anica · 3C Thread To Success™ Cooking Lab 🧪👨‍🍳  
> Last updated: 20 Nov 2026

---

## Stack

| Layer | Technology |
|-------|-----------|
| **Hosting** | GitHub Pages — `https://anica-blip.github.io/3c-word-search/` |
| **Admin sign-in** | GitHub sign-in through Supabase (owner only), project "Aurion 3C Mascot" |
| **Database** | Supabase — `word_search_puzzles` table (same project) |
| **File storage** | Cloudflare R2 → `3c-library-files` bucket, `WordSearch/` folder |
| **Worker** | Cloudflare Worker — `3c-wordsearch.3c-innertherapy.workers.dev` |

**There is no Vercel in this app.** Sign-in goes from the browser straight to Supabase and GitHub. Everything is hosted on GitHub Pages, and the Worker runs on Cloudflare.

---

## How protection works (read this before changing anything)

| Who | What they can do |
|-----|------------------|
| Anyone (players) | Open a puzzle page and read a puzzle (`GET /puzzle/:slug` on the Worker, and read the list in Supabase). |
| The owner only | Save, delete and upload (puzzle files, landing image, media). Every one of these Worker routes needs a valid Supabase sign-in **and** an `is_owner()` check; wrong or missing sign-in is refused. |

- The Worker asks Supabase (`rpc/is_owner`) whether the signed-in person is the owner. It fails closed: if Supabase cannot be reached, nothing is saved.
- The Worker accepts changes only from `https://anica-blip.github.io`. There are **no** localhost addresses.
- The Worker holds **no secrets and no variables**. Only the public Supabase address and public anon key are in the code.
- Sessions are Supabase sessions and refresh themselves. There is no fixed lock-out date.

---

## Repository Structure

```
repo root/
├── worker.js                — Cloudflare Worker source (pasted into the Cloudflare editor)
├── wrangler.toml            — Record of the Worker's settings (NOT used to deploy, see section 2)
├── style.css                — Public game styles
├── index.html               — Root redirect → admin/index.html
├── landing.html             — Public landing page (reads ?puzzle=, then opens public/index.html)
├── login.html               — Admin sign-in page (GitHub through Supabase)
├── auth-guard.js            — Page guard: sends signed-out or non-owner visitors to login.html
├── SETUP.md                 — This file
├── README.md
├── LEGAL_DISCLAIMER.md
├── LICENSE
├── favicon.png              — Tab icon
│
├── admin/
│   ├── index.html           — Admin puzzle builder (behind auth-guard.js)
│   ├── landing-upload.html  — Upload / set the landing image for a puzzle (behind auth-guard.js)
│   ├── admin.css            — Admin dark purple styles
│   ├── builder.js           — Word generation, grid algorithm, save and delete logic
│   ├── supabaseAPI.js       — Supabase table operations + authHeaders() (adds the sign-in token)
│   ├── config.js            — Supabase URL, public anon key, Worker URL (safe to be public)
│   └── 3C Thread To Success logo.png
│
├── public/
│   └── index.html           — The whole game in one page (loading, consent, intro, puzzle, finale)
│
└── api/
    └── puzzle.js            — Leftover from an earlier design. NOT used by the app.
```

**About `api/puzzle.js`:** nothing in the app calls it. It was written for a hosting service the app no longer uses and it uses a Supabase service-role key. It can be deleted. Do not set it up anywhere.

---

## 1. Supabase Setup

Project: **Aurion 3C Mascot** (`cgxjqsbrditbteqhdyus`).

### Table: `word_search_puzzles`

```sql
create table word_search_puzzles (
  id            uuid default gen_random_uuid() primary key,
  puzzle_slug   text unique not null,
  title         text not null,
  word_list     text[] not null,
  grid_data     jsonb,
  bg_image      text,
  intro_asset   text,
  finale_asset  text,
  puzzle_url    text,
  r2_key        text,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
```

### Row Level Security (live setup)

RLS is on. Two policies exist:

- **`word_search_puzzles_select_anon_authenticated`** — anyone can read (SELECT).
- **`word_search_puzzles_owner_write`** — only the signed-in owner (matched by the account's email) can insert, update or delete.

No service-role key is used anywhere in this app.

### Sign-in (URL Configuration)

In Supabase → Authentication → URL Configuration → Redirect URLs, this one line covers the whole app:

```
https://anica-blip.github.io/3c-word-search/**
```

GitHub must be enabled as a sign-in provider in the same project (Authentication → Sign In / Providers).

Also in Supabase → Authentication → Sessions: **"Time-box user sessions" and "Inactivity timeout" must stay empty**, otherwise a fixed lock-out comes back.

---

## 2. Cloudflare Worker Setup

### Worker name: `3c-wordsearch`

### Deploy method: paste in the Cloudflare dashboard (never Wrangler)

This Worker is updated by pasting `worker.js` into the Cloudflare editor:

1. Cloudflare → Workers & Pages → `3c-wordsearch` → **Edit code**.
2. Select everything, delete it, paste the full `worker.js`, click **Deploy**.

**Never run `wrangler deploy` for this Worker.** Wrangler replaces the Worker's code and settings with what is in `wrangler.toml` and would overwrite what was pasted. The `wrangler.toml` file in the repo is only a record of the settings. To see how a Worker was last deployed, open its **Deployments** tab; this one says "Manually deployed".

### R2 Binding

In Cloudflare Dashboard → Worker → Settings → Bindings:
```
Variable name:  WORDSEARCH_BUCKET
Bucket name:    3c-library-files
```

### Variables and Secrets

None. The Worker needs no variables and no secrets. If any appear under Settings → Variables and Secrets, they are leftovers and can be removed.

### Worker routes

| Route | Who | What |
|-------|-----|------|
| `GET /puzzle/:slug` | Public | Read a puzzle's JSON |
| `PUT /puzzle/:slug` | Owner only | Save a puzzle's JSON (JSON object, up to 1 MB) |
| `DELETE /puzzle/:slug` | Owner only | Delete a puzzle's JSON |
| `PUT /landing/:slug` | Owner only | Upload the landing image (extension sent in the `X-File-Extension` header) |
| `PUT /media/:slug/:filename` | Owner only | Upload background, intro or finale media |

Uploads accept only png, jpg, jpeg, gif, webp, mp4, webm, mov and ogg, up to 90 MB each. Anything else is refused.

### R2 Folder Structure
```
3c-library-files/
└── WordSearch/
    ├── puzzle.01.json
    ├── puzzle.02.json
    └── puzzle.NN/
        ├── landing.png (or other allowed type)
        ├── bg.png
        ├── intro.png (or .mp4)
        └── finale.png (or .mp4)
```

Public files are served from `https://files.3c-public-library.org/WordSearch/...`.

### Allowed origin in worker.js
```js
const ALLOWED_ORIGINS = ['https://anica-blip.github.io'];
```

GitHub Pages is the only origin that can make changes.

---

## 3. Background Image Setup

The public game page (`public/index.html`) loads the background image from the puzzle's `bg_image` field stored in R2.

**To set a background:**
1. In the admin builder, upload a background image when creating a puzzle
2. It uploads to `WordSearch/{slug}/bg.{ext}` in R2
3. The public URL is served via `https://files.3c-public-library.org/WordSearch/...`
4. The game page injects the image dynamically — no hardcoded paths needed

**Recommended image specs:**
- Landscape orientation (matches mobile landscape gameplay)
- Min 1280×720px, under 2MB for fast mobile load
- Format: JPG or WebP preferred

---

## 4. Public Puzzle URL Format

```
https://anica-blip.github.io/3c-word-search/landing.html?puzzle=puzzle.01
```

Share this URL on Telegram / library for members to play.

**Note**:
- `landing.html` is the entry point: it reads the puzzle from the Worker, then opens `public/index.html?puzzle={slug}` to start the game flow.
- All public game URLs use GitHub Pages.

---

## 5. Admin Workflow

1. Go to `https://anica-blip.github.io/3c-word-search/login.html`
2. Click the GitHub sign-in button → GitHub → back to the login page → straight into the admin builder (only the owner's account gets in; any other account is signed out with a notice)
3. Enter puzzle title + word list (one word per line)
4. Upload background image, intro asset, finale asset (optional)
5. Click **⚡ Generate 12×12 Grid** — preview appears
6. Click **💾 Save Puzzle** — saves to R2 + Supabase (the status message appears in the box under the Grid Generator and disappears after 5 seconds)
7. Open `admin/landing-upload.html` to add the landing image for a puzzle (optional)
8. Copy puzzle URL from the archive table
9. Share URL with members

**Sign-in flow**:
- Login page: GitHub Pages (`login.html`)
- Sign-in: GitHub → Supabase (PKCE), session stored in the browser under its own key (`sb-3c-word-search-login`), refreshed automatically
- Admin pages: GitHub Pages, behind `auth-guard.js`, which checks `is_owner()` before showing the page

---

## 6. Game Flow

```
Member receives URL (landing.html?puzzle=puzzle.01)
      ↓
Landing page — loads puzzle data from the Worker (R2)
      ↓
public/index.html — one page that moves through these screens:
  • Consent / start (instructions + word count)
  • Intro media (image or video, if set)
  • 12×12 word search
      – Drag/tap letters to select a word
      – Green = found ✅  |  Red flash = wrong ❌
      – Counter: "3 / 6 found" pulses on each find
      – "Continue →" appears when all words found
      – "Quit" always available
  • Finale media (image or video + Well Done message)
```

---

## Credits

Designed and Built with ❤ by Claude (Anthropic) × Chef Anica · 3C Thread To Success™ Cooking Lab 🧪👨‍🍳

> _"Think Smarter, Not Harder — Zero Shortcuts"_
