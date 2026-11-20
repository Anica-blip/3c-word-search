# 3C Word Search Game

> ⚖️ This repository is protected under a binding [Legal Disclaimer](./LEGAL_DISCLAIMER.md) that governs all use, cloning, and forking from the date of inception. Please read before use.

This project is part of the 3C Thread To Success™ ecosystem — a growing digital platform that combines creativity, structure, and real-world application.

The 3C Thread To Success™ brand, including its name, structure, characters (Aurion 3C Mascot), and overall system design, remains the intellectual property of the creator and is not included in this license.

Commercial use of the brand or replication of the ecosystem identity is not permitted without permission.

---

> _Interactive 12×12 word search puzzle game with custom backgrounds and media._  

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
| **Admin Login** | [login.html](https://anica-blip.github.io/3c-word-search/login.html) |
| **Admin Panel** | [admin/index.html](https://anica-blip.github.io/3c-word-search/admin/index.html) |
| **Public Game** | `landing.html?puzzle=puzzle.01` |

**Example Game URL**:
```
https://anica-blip.github.io/3c-word-search/landing.html?puzzle=puzzle.01
```

**Note**: `landing.html` is the main entry point that loads puzzle data and triggers the game flow through `public/index.html` (consent page).

---

## Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Hosting** | GitHub Pages | All pages (admin + public games) |
| **Sign-in** | GitHub through Supabase | Owner-only admin login |
| **Database** | Supabase | Puzzle metadata storage |
| **Storage** | Cloudflare R2 | Media files (backgrounds, intro, finale) |
| **Worker** | Cloudflare Worker | R2 file upload/retrieval API (reads public, changes owner-only) |

**Key Design**: there is no Vercel in this app. Sign-in goes from the browser straight to Supabase and GitHub, all pages are hosted on GitHub Pages, and every change (save, delete, upload) needs the owner's sign-in, checked again by the Worker.

---

## Features

### Admin Panel
- ✅ GitHub sign-in through Supabase (owner only; any other account is signed out)
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
- **Auth**: GitHub sign-in through Supabase, owner check (`is_owner()`) on every admin page and every Worker change
- **Database**: Supabase PostgreSQL with RLS policies
- **Storage**: Cloudflare R2 bucket (`3c-library-files/WordSearch/`)
- **Worker**: Cloudflare Worker for R2 file operations
- **Hosting**: GitHub Pages

---

## Game Flow

```
1. Member receives puzzle URL (landing.html?puzzle=puzzle.01)
   ↓
2. Landing page — loads puzzle data from the Worker (R2)
   ↓
3. public/index.html — one page that moves through these screens:
   • Consent/Start (title, word count, instructions)
   • Intro media (optional)
   • 12×12 word search grid
     – Drag/tap letters to select words
     – Green = found ✅  |  Red flash = wrong ❌
     – Counter updates: "3 / 6 found"
     – "Continue →" appears when complete
   • Finale media (optional) + "Well Done!"
```

---

## Admin Workflow

1. Go to [login.html](https://anica-blip.github.io/3c-word-search/login.html)
2. Click the GitHub sign-in button
3. Authorize on GitHub → you land in the admin panel (only the owner's account gets in)
4. Enter puzzle title and word list
5. Upload background image, intro, and finale assets (optional)
6. Click **⚡ Generate 12×12 Grid** to preview
7. Click **💾 Save Puzzle** to publish
8. Copy puzzle URL from archive
9. Share URL with members

---

## Setup

See [SETUP.md](./SETUP.md) for complete deployment instructions including:
- Supabase table, policies and sign-in setup
- Cloudflare Worker deployment (pasted in the dashboard, never Wrangler)
- How the protection works
- R2 bucket structure

---

## File Structure

```
repo root/
├── worker.js                — Cloudflare Worker source
├── wrangler.toml            — Record of the Worker's settings (not used to deploy)
├── style.css                — Public game styles
├── index.html               — Root redirect
├── landing.html             — Landing page
├── login.html               — Admin sign-in page
├── auth-guard.js            — Admin page guard (owner check)
├── favicon.png              — Tab icon
├── admin/                   — Admin panel (GitHub Pages)
│   ├── index.html           — Puzzle builder
│   ├── landing-upload.html  — Landing image upload
│   └── ...
├── public/                  — Public game (GitHub Pages)
│   └── index.html           — Whole game in one page (consent, intro, puzzle, finale)
└── api/
    └── puzzle.js            — Unused leftover (see SETUP.md)
```

---

## 🎨 Credits

*Designed and Built with ❤️ by Claude (Anthropic) × Chef Anica · 3C Thread To Success™ Cooking Lab*  🧪👨‍🍳

"Think Smarter, Not Harder - Zero Shortcuts"

---

## 👤 Creator

Anica-blip (“Chef”)
Founder of 3C Thread To Success™ ("Cooking Lab")
Independent Creator | Community Builder

---

🧠 Philosophy

“Think it. Do it. Own it.”

This project was built from vision, persistence, and a commitment to creating meaningful and structured experiences — even with minimal resources.
