# 3C Word Search — SETUP.md

> _Complete setup reference for the 3C Word Search Game._  
> Built by Claude (Anthropic) × Chef Anica · 3C Thread To Success Cooking Lab 🧪👨‍🍳

---

## Stack

| Layer | Technology |
|-------|-----------|
| **Hosting** | GitHub Pages — `https://anica-blip.github.io/3c-word-search/` |
| **Admin Auth** | GitHub OAuth → Vercel API routes (OAuth ONLY) |
| **Database** | Supabase — `word_search_puzzles` table |
| **File Storage** | Cloudflare R2 → `3c-library-files` bucket, `WordSearch/` folder |
| **Worker** | Cloudflare Worker — `3c-wordsearch.3c-innertherapy.workers.dev` |

**Important**: Vercel is used **ONLY for OAuth** (`/api/auth/login` and `/api/auth/callback`). All other pages are hosted on GitHub Pages.

---

## Repository Structure

```
repo root/
├── worker.js                — Cloudflare Worker source
├── style.css                — Public game glassmorphism styles
├── index.html               — Root redirect → admin/login.html
├── landing.html             — Landing page (if used)
├── Vercel.json              — Vercel routing config (OAuth only)
├── SETUP.md                 — This file
├── README.md
├── favicon.png              — Tab icon
│
├── admin/
│   ├── index.html           — Admin puzzle builder (session-guarded)
│   ├── login.html           — GitHub OAuth login page
│   ├── signout.html         — Sign out confirmation page
│   ├── admin.css            — Admin dark purple styles
│   ├── builder.js           — Word gen + grid algorithm + save logic
│   ├── supabaseAPI.js       — Supabase table operations
│   ├── config.js            — Supabase anon key + worker URL (safe to be public)
│   ├── auth.js              — Client-side session guard
│   ├── signout.js           — Sign out function
│   └── 3C Thread To Success logo.png  — Login page logo
│
├── public/
│   ├── index.html           — Consent / start page
│   ├── intro.html           — Intro media page
│   ├── games.html           — 12×12 word search game
│   └── finale.html          — Finale / completion page
│
└── api/                     — Vercel serverless functions (OAuth only)
    ├── auth/
    │   ├── login.js         — Redirects to GitHub OAuth
    │   └── callback.js      — Handles callback, validates Anica-blip
    └── puzzles.js           — (Optional) GET/POST/DELETE puzzle CRUD
```

---

## 1. Supabase Setup

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

### RLS Policies

```sql
-- Enable RLS
alter table word_search_puzzles enable row level security;

-- Public can read active puzzles (public game page fetches via anon key)
create policy "Public read active puzzles"
  on word_search_puzzles for select
  using (is_active = true);

-- Service role has full access (Vercel API uses service role key)
create policy "Service role full access"
  on word_search_puzzles for all
  using (auth.role() = 'service_role');
```

### URL Configuration

Add to Supabase → Authentication → URL Configuration → Redirect URLs:
```
https://anica-blip.github.io/3c-word-search/
```

**Note**: Supabase is accessed from GitHub Pages, not Vercel.

---

## 2. Cloudflare Worker Setup

### Worker name: `3c-wordsearch`
### R2 Binding

In wrangler.toml or Cloudflare Dashboard → Worker → Settings → Bindings:
```
Variable name:  WORDSEARCH_BUCKET
Bucket name:    3c-library-files
```

### R2 Folder Structure
```
3c-library-files/
└── WordSearch/
    ├── puzzle.01.json
    ├── puzzle.02.json
    └── puzzle.NN/
        ├── bg.png
        ├── intro.png (or .mp4)
        └── finale.png (or .mp4)
```

### Deploy worker
```bash
wrangler deploy worker.js --name 3c-wordsearch
```

### Allowed Origins in worker.js
```js
const ALLOWED_ORIGINS = [
  'https://anica-blip.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
];
```

**Note**: GitHub Pages is the only production origin needed. Vercel only handles OAuth, not content.

---

## 3. GitHub OAuth App

In GitHub → Settings → Developer Settings → OAuth Apps:

| Field | Value |
|-------|-------|
| Homepage URL | `https://3c-word-search.vercel.app` |
| Authorization callback URL | `https://3c-word-search.vercel.app/api/auth/callback` |

Copy **Client ID** and generate a **Client Secret**.

---

## 4. Vercel Environment Variables

In Vercel → Project → Settings → Environment Variables:

```
GITHUB_CLIENT_ID          = from GitHub OAuth App
GITHUB_CLIENT_SECRET      = from GitHub OAuth App
SUPABASE_URL              = https://cgxjqsbrditbteqhdyus.supabase.co
SUPABASE_ANON_KEY         = (anon key — also in config.js)
SUPABASE_SERVICE_ROLE_KEY = (service role key — never in repo)
```

Redeploy after adding env vars.

---

## 5. Background Image Setup

All 4 public pages (`index.html`, `intro.html`, `game.html`, `finale.html`) load the background image from the puzzle's `bg_image` field stored in R2.

**To set a background:**
1. In the admin builder, upload a background image when creating a puzzle
2. It uploads to `WordSearch/{slug}/bg.{ext}` in R2
3. The public URL is served via `https://files.3c-public-library.org/WordSearch/...`
4. All public pages inject the image dynamically — no hardcoded paths needed

**Recommended image specs:**
- Landscape orientation (matches mobile landscape gameplay)
- Min 1280×720px, under 2MB for fast mobile load
- Format: JPG or WebP preferred

---

## 6. Public Puzzle URL Format

```
https://anica-blip.github.io/3c-word-search/public/index.html?puzzle=puzzle.01
```

Share this URL on Telegram / library for members to play.

**Note**: All public game URLs use GitHub Pages. Vercel is not used for game hosting.

---

## 7. Admin Workflow

1. Go to `https://anica-blip.github.io/3c-word-search/admin/login.html`
2. Click **GitHub Access Connection** → redirects to Vercel OAuth
3. Authorize on GitHub → redirects back to GitHub Pages admin
4. Enter puzzle title + word list (one word per line)
5. Upload background image, intro asset, finale asset (optional)
6. Click **⚡ Generate 12×12 Grid** — preview appears
7. Click **💾 Save Puzzle** — saves to R2 + Supabase
8. Copy puzzle URL from the archive table
9. Share URL with members

**OAuth Flow**:
- Login page: GitHub Pages
- OAuth handler: Vercel (`/api/auth/login` → `/api/auth/callback`)
- Admin panel: GitHub Pages (session stored in localStorage)

---

## 8. Game Flow

```
Member receives URL
      ↓
Consent/Start page — instructions + word count
      ↓
Intro page — image or video (if set)
      ↓
Game page — 12×12 transparent grid on background
  • Drag/tap letters to select a word
  • Green = found ✅  |  Red flash = wrong ❌
  • Counter: "3 / 6 found" pulses on each find
  • "Continue →" appears when all words found
  • "Quit" always available
      ↓
Finale page — image or video + Well Done message
```

---

## Credits

Built by **Claude (Anthropic) × Chef Anica · 3C Thread To Success Cooking Lab** 🧪👨‍🍳

> _"Think Smart, Not Harder — Zero Shortcuts"_
