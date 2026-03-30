# 3C Word Search Game

> _Interactive 12×12 word search puzzle game with custom backgrounds and media._  
> Built by **Claude (Anthropic) × Chef Anica · 3C Thread To Success Cooking Lab** 🧪👨‍🍳

---

## Overview

A fully customizable word search game system where admins can create puzzles with:
- Custom word lists (up to 12 words)
- Background images
- Intro and finale media (images or videos)
- Automatic 12×12 grid generation
- Mobile-optimized gameplay with drag/tap selection

---

## Live URLs

| Page | URL |
|------|-----|
| **Admin Login** | [admin/login.html](https://anica-blip.github.io/3c-word-search/admin/login.html) |
| **Admin Panel** | [admin/index.html](https://anica-blip.github.io/3c-word-search/admin/index.html) |
| **Public Game** | `public/index.html?puzzle=puzzle.01` |

**Example Game URL**:
```
https://anica-blip.github.io/3c-word-search/public/index.html?puzzle=puzzle.01
```

---

## Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Hosting** | GitHub Pages | All pages (admin + public games) |
| **OAuth** | Vercel API Routes | GitHub OAuth login/callback only |
| **Database** | Supabase | Puzzle metadata storage |
| **Storage** | Cloudflare R2 | Media files (backgrounds, intro, finale) |
| **Worker** | Cloudflare Worker | R2 file upload/retrieval API |

**Key Design**: Vercel is used **ONLY for OAuth** (`/api/auth/login` and `/api/auth/callback`). All content is hosted on GitHub Pages.

---

## Features

### Admin Panel
- ✅ GitHub OAuth authentication (Anica-blip only)
- ✅ Create unlimited puzzles with auto-generated slugs (`puzzle.01`, `puzzle.02`, etc.)
- ✅ Word list input (one word per line, 2-12 letters)
- ✅ Automatic 12×12 grid generation with word placement algorithm
- ✅ Upload custom backgrounds, intro, and finale media
- ✅ Live grid preview before saving
- ✅ Puzzle archive with edit/delete capabilities
- ✅ Copy shareable URLs for each puzzle

### Public Game
- ✅ Consent/start page with puzzle title and word count
- ✅ Optional intro media page (image or video)
- ✅ 12×12 transparent grid overlay on custom background
- ✅ Drag or tap to select words
- ✅ Visual feedback: green highlight for correct words, red flash for incorrect
- ✅ Live counter showing found words (e.g., "3 / 6 found")
- ✅ "Continue" button appears when all words are found
- ✅ Optional finale media page with completion message
- ✅ Mobile landscape optimized

---

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no frameworks)
- **Auth**: GitHub OAuth via Vercel serverless functions
- **Database**: Supabase PostgreSQL with RLS policies
- **Storage**: Cloudflare R2 bucket (`3c-library-files/WordSearch/`)
- **Worker**: Cloudflare Worker for R2 file operations
- **Hosting**: GitHub Pages (main) + Vercel (OAuth only)

---

## Game Flow

```
1. Member receives puzzle URL
   ↓
2. Consent/Start page — shows title, word count, instructions
   ↓
3. Intro page (optional) — displays intro media
   ↓
4. Game page — 12×12 word search grid
   • Drag/tap letters to select words
   • Green = found ✅  |  Red flash = wrong ❌
   • Counter updates: "3 / 6 found"
   • "Continue →" appears when complete
   ↓
5. Finale page (optional) — displays finale media + "Well Done!"
```

---

## Admin Workflow

1. Go to [admin/login.html](https://anica-blip.github.io/3c-word-search/admin/login.html)
2. Click **GitHub Access Connection** → OAuth via Vercel
3. Authorize on GitHub → redirected back to admin panel
4. Enter puzzle title and word list
5. Upload background image, intro, and finale assets (optional)
6. Click **⚡ Generate 12×12 Grid** to preview
7. Click **💾 Save Puzzle** to publish
8. Copy puzzle URL from archive
9. Share URL with members

---

## Setup

See [SETUP.md](./SETUP.md) for complete deployment instructions including:
- Supabase database setup
- Cloudflare Worker deployment
- GitHub OAuth app configuration
- Vercel environment variables
- R2 bucket structure

---

## File Structure

```
repo root/
├── worker.js                — Cloudflare Worker source
├── style.css                — Public game styles
├── index.html               — Root redirect
├── landing.html             — Landing page
├── Vercel.json              — OAuth routing config
├── favicon.png              — Tab icon
├── admin/                   — Admin panel (GitHub Pages)
│   ├── login.html           — OAuth login page
│   ├── signout.html         — Sign out page
│   ├── index.html           — Puzzle builder
│   └── ...
├── public/                  — Public game pages (GitHub Pages)
│   ├── index.html           — Consent/start
│   ├── intro.html           — Intro media
│   ├── games.html           — Word search game
│   └── finale.html          — Completion page
└── api/                     — Vercel serverless (OAuth only)
    └── auth/
        ├── login.js         — GitHub OAuth redirect
        └── callback.js      — OAuth callback handler
```

---

## Credits

Built with ❤️ by **Claude (Anthropic) × Chef Anica**  
**3C Thread To Success Cooking Lab** 🧪👨‍🍳

> _"Think Smart, Not Harder — Zero Shortcuts"_
