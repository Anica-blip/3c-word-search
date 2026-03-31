// admin/config.js — 3C Word Search
// Built by Claude (Anthropic) × Chef Anica · 3C Thread To Success
//
// Architecture:
//   GitHub Pages → serves admin/, public/, landing.html (the app)
//   Cloudflare   → Worker + R2 (puzzle JSON + media storage)
//   Supabase     → word_search_puzzles table

(() => {
  if (window.__APP_CONFIG_LOADED__) return;
  window.__APP_CONFIG_LOADED__ = true;

  window.APP_CONFIG = Object.freeze({
    SUPABASE_URL:      'https://cgxjqsbrditbteqhdyus.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4',
    WORKER_URL:        'https://3c-wordsearch.3c-innertherapy.workers.dev',
    // Shareable puzzle URL — landing.html on GitHub Pages
    PUZZLE_BASE_URL:   'https://anica-blip.github.io/3c-word-search/landing.html',
  });
})();
